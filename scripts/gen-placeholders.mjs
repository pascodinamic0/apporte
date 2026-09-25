import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const outDir = path.join(ROOT, "public/images");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true }).catch(() => {});
}

async function make(name, color) {
  const file = path.join(outDir, name + ".png");
  const buf = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
  await fs.promises.writeFile(file, buf);
  return file;
}

async function main() {
  await ensureDir(outDir);
  const files = await Promise.all([
    make("burger", "#1f2937"),
    make("bread", "#374151"),
    make("pizza", "#4b5563"),
    make("fish", "#6b7280"),
    make("chicken", "#111827"),
    make("bistrot", "#0f766e"),
    make("sushi", "#0ea5e9"),
    make("powerbank", "#0e7490"),
    make("compressor", "#3b82f6"),
    make("lamp", "#f59e0b"),
    make("charger", "#6366f1"),
    make("holder", "#84cc16"),
    make("fan", "#06b6d4"),
    make("jumpstarter", "#ef4444"),
    make("emergency", "#f97316"),
  ]);
  console.log("Generated placeholders:", files);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

