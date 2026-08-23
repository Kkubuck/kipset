import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const [mode, source, destination] = process.argv.slice(2);
if (!mode || !source || !destination) {
  throw new Error("Usage: node scripts/process-image-assets.mjs <background|logo|symbol|anatomy-pair> <source> <destination>");
}

const output = resolve(destination);
await mkdir(mode === "anatomy-pair" ? output : dirname(output), { recursive: true });

if (mode === "background") {
  await sharp(resolve(source))
    .resize({ width: 1080, height: 1920, fit: "cover", position: "centre" })
    .webp({ quality: 78, effort: 6 })
    .toFile(output);
} else if (mode === "logo") {
  const sourceImage = await sharp(resolve(source))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: 880, height: 620, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 8, g: 9, b: 11, alpha: 1 } } })
    .composite([{ input: sourceImage, gravity: "centre" }])
    .png()
    .toFile(output);
} else if (mode === "symbol") {
  await sharp(resolve(source))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: 720, height: 420, fit: "inside", withoutEnlargement: false })
    .png()
    .toFile(output);
} else if (mode === "anatomy-pair") {
  const sourcePath = resolve(source);
  const metadata = await sharp(sourcePath).metadata();
  const halfWidth = Math.floor(metadata.width / 2);
  const renderFigure = async (left, width, name) => {
    const half = await sharp(sourcePath)
      .extract({ left, top: 0, width, height: metadata.height })
      .png()
      .toBuffer();
    const figure = await sharp(half)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({ width: 210, height: 468, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88, effort: 6, alphaQuality: 100 })
      .toBuffer();
    await sharp({ create: { width: 220, height: 480, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: figure, gravity: "centre" }])
      .webp({ quality: 88, effort: 6, alphaQuality: 100 })
      .toFile(resolve(output, name));
  };
  await Promise.all([
    renderFigure(0, halfWidth, "anatomy-front.webp"),
    renderFigure(halfWidth, metadata.width - halfWidth, "anatomy-back.webp"),
  ]);
} else {
  throw new Error(`Unknown image mode: ${mode}`);
}

console.log(`Created ${output}`);
