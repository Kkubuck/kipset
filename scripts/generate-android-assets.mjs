import { mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resourceRoot = resolve(projectRoot, "android", "app", "src", "main", "res");
const markPath = resolve(projectRoot, "public", "brand", "kipset-mark.png");
const symbolPath = resolve(projectRoot, "public", "brand", "kipset-symbol.png");

const legacySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const foregroundSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [density, size] of Object.entries(legacySizes)) {
  const directory = resolve(resourceRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  const icon = await sharp(markPath).resize(size, size).png().toBuffer();
  await Promise.all([
    sharp(icon).toFile(resolve(directory, "ic_launcher.png")),
    sharp(icon).toFile(resolve(directory, "ic_launcher_round.png")),
  ]);
}

for (const [density, size] of Object.entries(foregroundSizes)) {
  const directory = resolve(resourceRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  await sharp(symbolPath).resize(size, size, { fit: "contain" }).png().toFile(resolve(directory, "ic_launcher_foreground.png"));
}

const splashDirectories = (await readdir(resourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("drawable"))
  .map((entry) => resolve(resourceRoot, entry.name));

for (const directory of splashDirectories) {
  const splashPath = resolve(directory, "splash.png");
  try {
    const metadata = await sharp(splashPath).metadata();
    const width = metadata.width ?? 2732;
    const height = metadata.height ?? 2732;
    const markSize = Math.round(Math.min(width, height) * 0.24);
    const mark = await sharp(symbolPath).resize(markSize, markSize, { fit: "contain" }).png().toBuffer();
    await sharp({ create: { width, height, channels: 4, background: "#08090b" } })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toFile(splashPath);
  } catch {
    // Some Android drawable folders intentionally have no splash bitmap.
  }
}

console.log("KIPSET Android icons and splash screens are ready.");
