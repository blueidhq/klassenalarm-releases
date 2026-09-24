import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REPOSITORY = process.env.GITHUB_REPOSITORY ?? "blueidhq/klassenalarm-releases";
const API_ROOT = process.env.GITHUB_API_URL ?? "https://api.github.com";

export const platforms = {
  windows: {
    label: "Windows",
    tagPattern: /^windows\/(\d+(?:\.\d+)*)$/,
    assetPattern: /\.exe$/i,
    linkLabel: "Windows-Setup herunterladen",
    pagePath: "windows/README.md",
  },
  android: {
    label: "Android",
    tagPattern: /^android\/(\d+(?:\.\d+)*)$/,
    assetPattern: /\.apk$/i,
    linkLabel: "Android-App herunterladen",
    pagePath: "android/README.md",
  },
};

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return 0;
}

export function selectCurrentRelease(releases, platform) {
  const candidates = releases.flatMap((release) => {
    if (release.draft || release.prerelease) return [];

    const match = platform.tagPattern.exec(release.tag_name);
    if (!match) return [];

    const installers = release.assets.filter((asset) => platform.assetPattern.test(asset.name));
    if (installers.length !== 1) return [];

    return [{ release, version: match[1], asset: installers[0] }];
  });

  candidates.sort((left, right) => compareVersions(right.version, left.version));
  return candidates[0] ?? null;
}

function formatDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function stripDigestPrefix(digest) {
  return digest?.startsWith("sha256:") ? digest.slice(7) : null;
}

function releaseUrl(tag) {
  return `https://github.com/${REPOSITORY}/releases/tag/${tag}`;
}

function renderMainTable(current) {
  const rows = Object.entries(platforms).map(([key, platform]) => {
    const item = current[key];
    return `| ${platform.label} | ${item.version} | ${formatDate(item.release.published_at)} | [${platform.linkLabel}](${item.asset.browser_download_url}) |`;
  });

  return [
    "| Plattform | Version | Veröffentlicht | Installationsdatei |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderPlatformBlock(item, platform) {
  return [
    `## Version ${item.version}`,
    "",
    `Veröffentlicht am ${formatDate(item.release.published_at)}`,
    "",
    `[${platform.linkLabel}](${item.asset.browser_download_url})`,
    "",
    `[Alle Dateien und Angaben zu dieser Version ansehen](${releaseUrl(item.release.tag_name)})`,
  ].join("\n");
}

export function replaceGeneratedBlock(content, marker, replacement) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

  if (!pattern.test(content)) {
    throw new Error(`Missing generated block ${marker}`);
  }

  return content.replace(pattern, `${start}\n${replacement}\n${end}`);
}

async function fetchReleases() {
  const releases = [];
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "klassenalarm-release-index",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  for (let page = 1; ; page += 1) {
    const response = await fetch(`${API_ROOT}/repos/${REPOSITORY}/releases?per_page=100&page=${page}`, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
}

async function writeIfChanged(path, content) {
  const previous = await readFile(path, "utf8");
  if (previous === content) return false;
  await writeFile(path, content);
  return true;
}

export async function updateFiles(releases) {
  const current = {};

  for (const [key, platform] of Object.entries(platforms)) {
    const selected = selectCurrentRelease(releases, platform);
    if (!selected) {
      throw new Error(`No complete stable ${platform.label} release found`);
    }
    current[key] = selected;
  }

  const changed = [];
  const readme = await readFile("README.md", "utf8");
  const nextReadme = replaceGeneratedBlock(readme, "downloads", renderMainTable(current));
  if (await writeIfChanged("README.md", nextReadme)) changed.push("README.md");

  for (const [key, platform] of Object.entries(platforms)) {
    const page = await readFile(platform.pagePath, "utf8");
    const nextPage = replaceGeneratedBlock(page, "download", renderPlatformBlock(current[key], platform));
    if (await writeIfChanged(platform.pagePath, nextPage)) changed.push(platform.pagePath);
  }

  const metadata = {
    updatedAt: Object.values(current)
      .map((item) => item.release.published_at)
      .sort()
      .at(-1),
  };

  for (const key of Object.keys(platforms)) {
    const item = current[key];
    metadata[key] = {
      version: item.version,
      publishedAt: item.release.published_at,
      fileName: item.asset.name,
      downloadUrl: item.asset.browser_download_url,
      releaseUrl: releaseUrl(item.release.tag_name),
      sha256: stripDigestPrefix(item.asset.digest),
    };
  }

  const json = `${JSON.stringify(metadata, null, 2)}\n`;
  try {
    const previous = await readFile("downloads.json", "utf8");
    if (previous !== json) {
      await writeFile("downloads.json", json);
      changed.push("downloads.json");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeFile("downloads.json", json);
    changed.push("downloads.json");
  }

  return changed;
}

async function main() {
  const releases = await fetchReleases();
  const changed = await updateFiles(releases);
  console.log(changed.length ? `Updated ${changed.join(", ")}` : "Download pages are already current.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
