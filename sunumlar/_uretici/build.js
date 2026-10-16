#!/usr/bin/env node
// Kullanım:  node sunumlar/_uretici/build.js sunumlar/hafta-01
// Girdi:    <deste>/slaytlar.yaml      Çıktı:  <deste>/cikti/<ad>.pptx  +  <deste>/cikti/slayt-haritasi.txt
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const pptxgen = require("pptxgenjs");
const { TEMA, F } = require("./lib/tema");
const { duzenleriTanimla } = require("./lib/duzenler");
const { TURLER } = require("./lib/turler");
const { sonIsle } = require("./lib/sonislem");

async function uret(desteDizin) {
  desteDizin = path.resolve(desteDizin);
  const kaynak = yaml.load(fs.readFileSync(path.join(desteDizin, "slaytlar.yaml"), "utf8"));
  const d = kaynak.deste;
  // İsteğe bağlı konuşma metni: <deste>/konusma.yaml  { <id>: { soyle, sor, beklenen[], gecis } }
  const konusmaYol = path.join(desteDizin, "konusma.yaml");
  const konusma = fs.existsSync(konusmaYol) ? (yaml.load(fs.readFileSync(konusmaYol, "utf8")) || {}) : null;
  if (konusma) {
    const idler = new Set(kaynak.slaytlar.map((k) => k.id));
    for (const id of Object.keys(konusma)) if (!id.startsWith("_") && !idler.has(id)) console.warn(`⚠ konusma.yaml: slaytta olmayan id "${id}"`);
    for (const k of kaynak.slaytlar) {
      if (konusma[k.id]) k._konusma = konusma[k.id];
      else console.warn(`⚠ konusma.yaml: "${k.id}" için metin yok`);
    }
  }
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = d.baslik;
  pres.author = d.yazar || "Asım Sinan Yüksel";
  pres.company = "SDÜ Bilgisayar Mühendisliği";
  pres.subject = "İstem Mühendisliği";
  pres.theme = { headFontFace: F.baslik, bodyFontFace: F.govde };

  duzenleriTanimla(pres, { hafta: d.hafta, katman: d.katman });

  const ctx = {
    hafta: d.hafta, katman: d.katman, desteDizin, sonIslem: [],
    sayac: () => pres.slides.length, sayacGeriAl: () => {},
  };
  const harita = [];
  const kimlikler = new Set();
  let bolum = null;

  for (const k of kaynak.slaytlar) {
    if (!k.id) throw new Error(`Kimliksiz slayt: ${JSON.stringify(k).slice(0, 80)}`);
    if (kimlikler.has(k.id)) throw new Error(`Tekrarlanan id: ${k.id}`);
    kimlikler.add(k.id);
    const tur = TURLER[k.tur];
    if (!tur) throw new Error(`Bilinmeyen slayt türü "${k.tur}" (id: ${k.id})`);
    if (k.bolum && k.bolum !== bolum) { bolum = k.bolum; pres.addSection({ title: bolum }); }
    const once = pres.slides.length;
    await tur(pres, k, ctx);
    for (let i = once + 1; i <= pres.slides.length; i++) harita.push(`H${d.hafta}·${i}\t${k.id}\t${k.tur}`);
  }

  const ciktiDizin = path.join(desteDizin, "cikti");
  fs.mkdirSync(ciktiDizin, { recursive: true });
  const dosya = path.join(ciktiDizin, `${d.ad}.pptx`);
  await pres.writeFile({ fileName: dosya });
  await sonIsle(dosya, ctx.sonIslem);
  fs.writeFileSync(path.join(ciktiDizin, "slayt-haritasi.txt"), "Kod\tid\ttür\n" + harita.join("\n") + "\n");
  console.log(`✔ ${path.relative(process.cwd(), dosya)} — ${pres.slides.length} slayt`);
  return dosya;
}

if (require.main === module) {
  const hedef = process.argv[2];
  if (!hedef) { console.error("Kullanım: node build.js <deste-dizini>"); process.exit(1); }
  uret(hedef).catch((e) => { console.error("✖", e.message); process.exit(1); });
}

module.exports = { uret };
