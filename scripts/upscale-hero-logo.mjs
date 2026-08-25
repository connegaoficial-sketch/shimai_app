import sharp from "sharp";

const src = "public/logo_shimai.jpeg";
const out = "public/logo_shimai_hero.png";

const meta = await sharp(src).metadata();
const w = meta.width * 3;
const h = meta.height * 3;

// Soft oval alpha — center stays fully opaque (logo art untouched).
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g" cx="50%" cy="48%" rx="49%" ry="46%">
      <stop offset="0%" stop-color="white" stop-opacity="1"/>
      <stop offset="55%" stop-color="white" stop-opacity="1"/>
      <stop offset="72%" stop-color="white" stop-opacity="0.75"/>
      <stop offset="86%" stop-color="white" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

const mask = await sharp(svg).ensureAlpha().png().toBuffer();

await sharp(src)
  .resize(w, h, { kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png({ compressionLevel: 9 })
  .toFile(out);

const outV2 = "public/logo_shimai_hero_v2.png";
await sharp(out).toFile(outV2);

const result = await sharp(outV2).metadata();
console.log(
  "wrote",
  outV2,
  result.width,
  "x",
  result.height,
  "channels",
  result.channels,
  "hasAlpha",
  result.hasAlpha,
);
