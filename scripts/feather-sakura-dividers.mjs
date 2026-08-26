import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const srcDir = path.resolve(
  "C:/Users/PERSONAL/.cursor/projects/c-Users-PERSONAL-shimai-app/assets",
);
const outDir = path.resolve("public/sakura-dividers");
const files = [
  "sakura-strip-branches.png",
  "sakura-strip-petals.png",
  "sakura-strip-garland.png",
];

const PAGE_BLACK = { r: 8, g: 8, b: 8 };

/**
 * Restore from clean assets, crop hairline frame, paint soft black
 * fades on all edges (over), flatten to page black.
 */
async function processFile(file) {
  const input = path.join(srcDir, file);
  const output = path.join(outDir, file);
  if (!fs.existsSync(input)) {
    console.warn("missing source", input);
    return;
  }

  const meta = await sharp(input).metadata();
  const w = meta.width;
  const h = meta.height;
  const crop = 8;
  const cw = w - crop * 2;
  const ch = h - crop * 2;

  const cropped = await sharp(input)
    .extract({ left: crop, top: crop, width: cw, height: ch })
    .removeAlpha()
    .toBuffer();

  // Soft black curtains — opaque at edges, transparent in center
  const fadeSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(8,8,8)" stop-opacity="1"/>
      <stop offset="28%" stop-color="rgb(8,8,8)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="rgb(8,8,8)" stop-opacity="1"/>
      <stop offset="28%" stop-color="rgb(8,8,8)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgb(8,8,8)" stop-opacity="1"/>
      <stop offset="14%" stop-color="rgb(8,8,8)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="right" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0%" stop-color="rgb(8,8,8)" stop-opacity="1"/>
      <stop offset="14%" stop-color="rgb(8,8,8)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#top)"/>
  <rect width="100%" height="100%" fill="url(#bottom)"/>
  <rect width="100%" height="100%" fill="url(#left)"/>
  <rect width="100%" height="100%" fill="url(#right)"/>
</svg>`);

  const fade = await sharp(fadeSvg).ensureAlpha().png().toBuffer();

  await sharp(cropped)
    .ensureAlpha()
    .composite([{ input: fade, blend: "over" }])
    .flatten({ background: PAGE_BLACK })
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log("ok", file, `${cw}x${ch}`);
}

for (const file of files) {
  await processFile(file);
}
