import { build } from "esbuild";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "mobile-dist");
const outputAssets = resolve(outputRoot, "kipset-assets");
const appScript = '<script src="./kipset-assets/app.js" defer></script>';

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputAssets, { recursive: true });

const html = (await readFile(resolve(projectRoot, "src", "app.html"), "utf8"))
  .replace(appScript, `<script src="./kipset-assets/native-bridge.js" defer></script>\n    ${appScript}`);

if (!html.includes("native-bridge.js")) throw new Error("Could not inject the Android native bridge");
await writeFile(resolve(outputRoot, "index.html"), html, "utf8");

await Promise.all([
  build({
    entryPoints: [resolve(projectRoot, "src", "app.jsx")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome126"],
    minify: true,
    sourcemap: false,
    legalComments: "none",
    define: { "process.env.NODE_ENV": '"production"' },
    outfile: resolve(outputAssets, "app.js"),
  }),
  build({
    entryPoints: [resolve(projectRoot, "mobile", "native-bridge.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome126"],
    minify: true,
    sourcemap: false,
    legalComments: "none",
    outfile: resolve(outputAssets, "native-bridge.js"),
  }),
  copyFile(resolve(projectRoot, "src", "styles.css"), resolve(outputAssets, "app.css")),
  cp(resolve(projectRoot, "public", "backgrounds"), resolve(outputRoot, "backgrounds"), { recursive: true }),
  cp(resolve(projectRoot, "public", "brand"), resolve(outputRoot, "brand"), { recursive: true }),
  cp(resolve(projectRoot, "public", "anatomy"), resolve(outputRoot, "anatomy"), { recursive: true }),
]);

console.log("KIPSET Android web bundle is ready.");
