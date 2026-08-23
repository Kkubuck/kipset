import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

test("mobile bundle is complete, native-enabled, and offline-first", async () => {
  const [html, styles, appBundle, bridge, front, back] = await Promise.all([
    readFile(projectFile("mobile-dist/index.html"), "utf8"),
    readFile(projectFile("mobile-dist/kipset-assets/app.css"), "utf8"),
    readFile(projectFile("mobile-dist/kipset-assets/app.js"), "utf8"),
    readFile(projectFile("mobile-dist/kipset-assets/native-bridge.js"), "utf8"),
    stat(projectFile("mobile-dist/anatomy/anatomy-front.webp")),
    stat(projectFile("mobile-dist/anatomy/anatomy-back.webp")),
  ]);

  assert.match(html, /KIPSET — Functional Fitness Companion/);
  assert.match(html, /native-bridge\.js/);
  assert.match(html, /viewport-fit=cover/);
  assert.ok(html.indexOf("native-bridge.js") < html.indexOf("app.js"));
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(appBundle, /Cindy/);
  assert.match(appBundle, /Share story image/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /safe-area-inset-top/);
  assert.ok(bridge.length > 10_000);
  assert.match(bridge, /app\.kipset\.training|KipsetNative|Share KIPSET Story/);
  assert.ok(front.size > 10_000);
  assert.ok(back.size > 10_000);
});

test("Capacitor project contains the current KIPSET bundle after sync", async () => {
  const nativeRoot = projectFile("android/app/src/main/assets/public/");
  await Promise.all([
    access(new URL("index.html", nativeRoot)),
    access(new URL("kipset-assets/app.js", nativeRoot)),
    access(new URL("kipset-assets/native-bridge.js", nativeRoot)),
    access(new URL("anatomy/anatomy-front.webp", nativeRoot)),
  ]);
  const config = await readFile(projectFile("android/app/src/main/assets/capacitor.config.json"), "utf8");
  assert.match(config, /app\.kipset\.training/);
  assert.match(config, /KIPSET/);
});
