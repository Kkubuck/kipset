import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

test("desktop bundle is complete, offline-first, and hardened", async () => {
  const [html, appBundle, preload, main, packageSource, ...assets] = await Promise.all([
    readFile(projectFile("desktop-dist/index.html"), "utf8"),
    readFile(projectFile("desktop-dist/kipset-assets/app.js"), "utf8"),
    readFile(projectFile("desktop/preload.mjs"), "utf8"),
    readFile(projectFile("desktop/main.mjs"), "utf8"),
    readFile(projectFile("package.json"), "utf8"),
    stat(projectFile("desktop-dist/backgrounds/dawn-box.webp")),
    stat(projectFile("desktop-dist/backgrounds/arena-light.webp")),
    stat(projectFile("desktop-dist/backgrounds/concrete-room.webp")),
    stat(projectFile("desktop-dist/backgrounds/chalk-air.webp")),
    stat(projectFile("desktop-dist/backgrounds/rainy-warehouse.webp")),
    stat(projectFile("desktop-dist/backgrounds/monochrome-box.webp")),
    stat(projectFile("desktop-dist/anatomy/anatomy-front.webp")),
    stat(projectFile("desktop-dist/anatomy/anatomy-back.webp")),
    stat(projectFile("desktop-dist/brand/kipset-symbol.png")),
    stat(projectFile("desktop-resources/icon.png")),
  ]);

  assert.match(html, /KIPSET — Functional Fitness Companion/);
  assert.match(html, /\.\/kipset-assets\/app\.js/);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(appBundle, /Cindy/);
  assert.match(appBundle, /Murph/);
  assert.match(appBundle, /monochrome-box\.webp/);
  assert.match(preload, /KipsetNative/);
  assert.match(preload, /kipset:save-state/);
  assert.match(preload, /process\.platform === "darwin"/);
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /sandbox: true/);
  assert.match(main, /allowedHosts/);
  assert.match(main, /process\.platform !== "darwin"/);
  const packageJson = JSON.parse(packageSource);
  assert.equal(packageJson.build.productName, "KIPSET");
  assert.equal(packageJson.build.mac.artifactName, "KIPSET-${version}-macOS-${arch}.${ext}");
  assert.match(packageJson.scripts["desktop:runtime"], /electron\/install\.js/);
  assert.match(packageJson.scripts["desktop:portable"], /config\.electronDist=node_modules\/electron\/dist/);
  assert.match(packageJson.scripts["desktop:mac:x64"], /--x64/);
  assert.match(packageJson.scripts["desktop:mac:arm64"], /--arm64/);
  assets.slice(0, 6).forEach((background) => assert.ok(background.size > 30_000));
  assets.slice(6, 8).forEach((anatomy) => assert.ok(anatomy.size > 10_000));
  assert.ok(assets.at(-1).size > 1_000);
});
