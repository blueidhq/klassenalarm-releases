"""Prepare the x64 Intune payload from a published Klassenalarm Windows ZIP."""

import argparse
import hashlib
import json
import re
import shutil
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

APP_NAME = "BlueID.Klassenalarm"
PUBLISHER = "CN=A46C93AD-572A-4A78-85FE-00D2A80E9A9D"
SOURCES = Path(__file__).resolve().parents[2] / "windows" / "intune"


def manifest(archive, filename):
    return ElementTree.fromstring(archive.read(filename))


def identity(package):
    return package.find("{*}Identity").attrib


def version_parts(version):
    if not re.fullmatch(r"\d+\.\d+\.\d+\.\d+", version):
        raise ValueError(f"Invalid package version: {version}")
    return tuple(int(part) for part in version.split("."))


def prepare(archive, version, output):
    version_parts(version)
    bundle_name = f"klassenalarm_{version}_x64.msixbundle"
    certificate = "klassenalarm-prod-signing.cer"
    with ZipFile(BytesIO(archive.read(bundle_name))) as bundle:
        bundle_manifest = manifest(bundle, "AppxMetadata/AppxBundleManifest.xml")
        expected = {"Name": APP_NAME, "Publisher": PUBLISHER, "Version": version}
        if not expected.items() <= identity(bundle_manifest).items():
            raise ValueError("Windows release tag and production bundle identity differ")
        application, = bundle_manifest.findall(".//{*}Package[@Type='application']")
        if application.get("Architecture") != "x64":
            raise ValueError("Expected an x64 application")
        with ZipFile(BytesIO(bundle.read(application.attrib["FileName"]))) as app:
            app_manifest = manifest(app, "AppxManifest.xml")
            if not expected.items() <= identity(app_manifest).items():
                raise ValueError("Application identity differs from bundle")
            required = {dep.get("Name"): dep for dep in app_manifest.findall(".//{*}PackageDependency")}

    dependencies = []
    for name in archive.namelist():
        if not re.fullmatch(r"Dependencies/x64/[\w.-]+\.(?:appx|msix)", name):
            continue
        with ZipFile(BytesIO(archive.read(name))) as framework:
            framework_id = identity(manifest(framework, "AppxManifest.xml"))
        dependency = required.pop(framework_id["Name"], None)
        if (dependency is None or framework_id["Publisher"] != dependency.get("Publisher")
                or framework_id["ProcessorArchitecture"] not in ("neutral", "x64")
                or version_parts(framework_id["Version"]) < version_parts(dependency.attrib["MinVersion"])):
            raise ValueError(f"Unexpected framework or incompatible version: {name}")
        dependencies.append(name)
    if required:
        raise ValueError(f"Missing frameworks: {', '.join(required)}")

    payload = output / "Paket"
    payload.mkdir(parents=True)
    files = []
    for name in [bundle_name, certificate, *dependencies]:
        contents = archive.read(name)
        target = payload / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(contents)
        files.append({"path": name, "sha256": hashlib.sha256(contents).hexdigest()})
    metadata = {"bundle": bundle_name, "certificate": certificate, "dependencies": dependencies, "files": files}
    (payload / "release.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    for name in ("Deploy.cmd", "Install-Klassenalarm.ps1", "Uninstall-Klassenalarm.ps1"):
        contents = (SOURCES / name).read_text(encoding="utf-8")
        (payload / name).write_text(contents, encoding="ascii", newline="\r\n")
    detect = (SOURCES / "Detect-Klassenalarm.ps1.in").read_text(encoding="ascii").replace("@VERSION@", version)
    (payload / "Detect-Klassenalarm.ps1").write_text(detect, encoding="utf-8-sig", newline="\r\n")
    shutil.copyfile(SOURCES / "README.md", output / "Intune-Anleitung.md")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    parser.add_argument("version")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with ZipFile(args.zip) as archive:
        prepare(archive, args.version, args.output)
