import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "desktop-dist");
const resourceRoot = resolve(projectRoot, "desktop-resources");

await rm(outputRoot, { recursive: true, force: true });
await rm(resourceRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(outputRoot, { recursive: true }),
  mkdir(resourceRoot, { recursive: true }),
]);

const desktopAssets = resolve(outputRoot, "kipset-assets");
await mkdir(desktopAssets, { recursive: true });
await build({
  entryPoints: [resolve(projectRoot, "src", "app.jsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome126"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: resolve(desktopAssets, "app.js"),
});

await Promise.all([
  copyFile(resolve(projectRoot, "src", "app.html"), resolve(outputRoot, "index.html")),
  copyFile(resolve(projectRoot, "src", "styles.css"), resolve(desktopAssets, "app.css")),
  cp(resolve(projectRoot, "public", "backgrounds"), resolve(outputRoot, "backgrounds"), { recursive: true }),
  cp(resolve(projectRoot, "public", "brand"), resolve(outputRoot, "brand"), { recursive: true }),
  cp(resolve(projectRoot, "public", "anatomy"), resolve(outputRoot, "anatomy"), { recursive: true }),
  copyFile(resolve(projectRoot, "public", "brand", "kipset-mark.png"), resolve(resourceRoot, "icon.png")),
]);

console.log("KIPSET desktop bundle is ready.");
