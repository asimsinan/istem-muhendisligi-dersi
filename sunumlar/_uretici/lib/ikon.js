// Lucide ikonlarını (çizgi stili) tema renginde PNG'ye çevirir.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IKON_DIZIN = path.join(__dirname, "..", "node_modules", "lucide-static", "icons");
const onbellek = new Map();

async function ikon(ad, renkHex, boyutPx = 256, kalinlik = 2) {
  const anahtar = `${ad}|${renkHex}|${boyutPx}|${kalinlik}`;
  if (onbellek.has(anahtar)) return onbellek.get(anahtar);
  const dosya = path.join(IKON_DIZIN, `${ad}.svg`);
  if (!fs.existsSync(dosya)) throw new Error(`İkon bulunamadı: ${ad}`);
  let svg = fs.readFileSync(dosya, "utf8")
    .replace(/stroke="currentColor"/g, `stroke="#${renkHex}"`)
    .replace(/stroke-width="[^"]*"/g, `stroke-width="${kalinlik}"`)
    .replace(/width="24"/, `width="${boyutPx}"`)
    .replace(/height="24"/, `height="${boyutPx}"`);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const veri = "image/png;base64," + png.toString("base64");
  onbellek.set(anahtar, veri);
  return veri;
}

module.exports = { ikon };
