import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = process.cwd();
const srcSvg = path.join(ROOT, "public/icons/apporte.svg");
const outDir = path.join(ROOT, "public");
const iconsDir = path.join(outDir, "icons");
const splashDir = path.join(outDir, "splash");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true }).catch(() => {});
}

async function generatePngIcon(svgPath, size, fileName, { pad = 0, bg = "#047857" } = {}) {
  const pixels = size;
  const inset = Math.max(0, Math.floor((pad / 100) * pixels));
  const canvas = sharp({
    create: {
      width: pixels,
      height: pixels,
      channels: 4,
      background: { r: 4, g: 120, b: 87, alpha: 1 }, // emerald-700
    },
  });
  const logo = sharp(svgPath).resize(pixels - inset * 2, pixels - inset * 2, { fit: "contain" });
  const composite = await canvas
    .composite([{ input: await logo.png().toBuffer(), top: inset, left: inset }])
    .png()
    .toBuffer();
  const dest = path.join(iconsDir, fileName);
  await fs.promises.writeFile(dest, composite);
  return dest;
}

async function generateSplash(svgPath, width, height, fileName, bg = "#047857") {
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bg,
    },
  });
  const minSide = Math.min(width, height);
  const logoSize = Math.floor(minSide * 0.25);
  const logo = sharp(svgPath).resize(logoSize, logoSize, { fit: "contain" });
  const logoBuf = await logo.png().toBuffer();
  const composite = await canvas
    .composite([{ input: logoBuf, top: Math.floor(height / 2 - logoSize / 2), left: Math.floor(width / 2 - logoSize / 2) }])
    .png()
    .toBuffer();
  const dest = path.join(splashDir, fileName);
  await fs.promises.writeFile(dest, composite);
  return dest;
}

async function main() {
  await ensureDir(iconsDir);
  await ensureDir(splashDir);
  // Core icons
  const icon192 = await generatePngIcon(srcSvg, 192, "icon-192.png", { pad: 12 });
  const icon512 = await generatePngIcon(srcSvg, 512, "icon-512.png", { pad: 10 });
  const maskable512 = await generatePngIcon(srcSvg, 512, "maskable-512.png", { pad: 24 });
  const apple180 = await generatePngIcon(srcSvg, 180, "apple-touch-icon-180.png", { pad: 12 });
  const fav32 = await generatePngIcon(srcSvg, 32, "../favicon-32x32.png", { pad: 10 });
  const fav16 = await generatePngIcon(srcSvg, 16, "../favicon-16x16.png", { pad: 10 });
  // ICO from both sizes
  const icoBuf = await pngToIco([path.join(outDir, "favicon-16x16.png"), path.join(outDir, "favicon-32x32.png")]);
  await fs.promises.writeFile(path.join(outDir, "favicon.ico"), icoBuf);
  // iOS startup images (a focused current subset)
  await generateSplash(srcSvg, 1290, 2796, "apple-splash-1290x2796.png"); // iPhone 15 Pro Max
  await generateSplash(srcSvg, 1170, 2532, "apple-splash-1170x2532.png"); // iPhone 13/14
  await generateSplash(srcSvg, 750, 1334, "apple-splash-750x1334.png"); // iPhone SE (2/3)
  await generateSplash(srcSvg, 1179, 2556, "apple-splash-1179x2556.png"); // 393x852@3
  await generateSplash(srcSvg, 1206, 2622, "apple-splash-1206x2622.png"); // 402x874@3
  await generateSplash(srcSvg, 1320, 2868, "apple-splash-1320x2868.png"); // 440x956@3

  console.log("Icons generated:", { icon192, icon512, maskable512, apple180, fav32, fav16 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

