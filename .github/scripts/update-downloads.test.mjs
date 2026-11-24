import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersions,
  platforms,
  renderPlatformBlock,
  replaceGeneratedBlock,
  selectCurrentRelease,
} from "./update-downloads.mjs";

function release(tag, options = {}) {
  return {
    tag_name: tag,
    draft: options.draft ?? false,
    prerelease: options.prerelease ?? false,
    published_at: options.publishedAt ?? "2026-01-01T00:00:00Z",
    assets: (options.assets ?? []).map((name) => ({
      name,
      browser_download_url: `https://example.invalid/${name}`,
      digest: null,
    })),
  };
}

test("compares versions with different segment counts", () => {
  assert.equal(compareVersions("1.0.15.0", "1.0.9.0") > 0, true);
  assert.equal(compareVersions("5.2", "5.2.0"), 0);
});

test("selects the highest complete stable platform release", () => {
  const releases = [
    release("windows/1.0.15.0", { assets: ["setup.exe"] }),
    release("windows/1.0.16.0", { assets: ["checksums.txt"] }),
    release("windows/1.0.17.0", { assets: ["one.exe", "two.exe"] }),
    release("windows/1.0.18.0", { assets: ["setup.exe"], prerelease: true }),
    release("android/99.0.0", { assets: ["app.apk"] }),
  ];

  assert.equal(selectCurrentRelease(releases, platforms.windows).version, "1.0.15.0");
});

test("ignores legacy Android tags without the platform prefix", () => {
  const releases = [
    release("99.0.0", { assets: ["app.apk"] }),
    release("android/5.2.0", { assets: ["app.apk"] }),
  ];

  assert.equal(selectCurrentRelease(releases, platforms.android).version, "5.2.0");
});

test("links directly to each Windows asset from the selected release", () => {
  const previous = release("windows/1.0.15.0", { assets: ["setup.exe", "previous.msixbundle"] });
  const current = release("windows/1.0.16.0", {
    assets: ["setup.exe", "current.msixbundle", "klassenalarm-windows-1.0.16.0.zip"],
  });

  const block = renderPlatformBlock(selectCurrentRelease([previous, current], platforms.windows), platforms.windows);
  assert.match(block, /\[Windows-Setup herunterladen\]\(https:\/\/example\.invalid\/setup\.exe\)/);
  assert.match(block, /\[MSIX-Bundle herunterladen\]\(https:\/\/example\.invalid\/current\.msixbundle\)/);
  assert.match(block, /\(https:\/\/example\.invalid\/klassenalarm-windows-1\.0\.16\.0\.zip\)/);
  assert.doesNotMatch(block, /previous\.msixbundle/);

  current.assets.splice(1, 1);
  const blockWithoutBundle = renderPlatformBlock(selectCurrentRelease([previous, current], platforms.windows), platforms.windows);
  assert.match(blockWithoutBundle, /## Version 1\.0\.16\.0/);
  assert.doesNotMatch(blockWithoutBundle, /msixbundle/i);
});

test("replaces only the generated block", () => {
  const input = "before\n<!-- download:start -->\nold\n<!-- download:end -->\nafter\n";
  const expected = "before\n<!-- download:start -->\nnew\n<!-- download:end -->\nafter\n";
  assert.equal(replaceGeneratedBlock(input, "download", "new"), expected);
});

test("fails when a generated block is missing", () => {
  assert.throws(() => replaceGeneratedBlock("content", "download", "new"), /Missing generated block/);
});
