import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(projectRoot, "public", "kipset-assets");

await mkdir(assetRoot, { recursive: true });
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
  outfile: resolve(assetRoot, "app.js"),
});

await Promise.all([
  copyFile(resolve(projectRoot, "src", "styles.css"), resolve(assetRoot, "app.css")),
  copyFile(resolve(projectRoot, "src", "app.html"), resolve(projectRoot, "public", "kipset.html")),
  copyFile(resolve(projectRoot, "src", "app.html"), resolve(projectRoot, "index.html")),
]);

console.log("KIPSET web bundle is ready.");
