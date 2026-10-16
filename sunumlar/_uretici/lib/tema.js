// Tema: tasarim/tema.json tek kaynaktır. Burada yalnızca okunur ve türetilir.
const fs = require("fs");
const path = require("path");

const KOK = path.resolve(__dirname, "..", "..", "..");
const TEMA = JSON.parse(fs.readFileSync(path.join(KOK, "tasarim", "tema.json"), "utf8"));

const R = TEMA.renk;          // hex, '#' olmadan
const F = TEMA.font;
const PT = TEMA.pt;
const S = TEMA.slayt;

// Sık kullanılan ölçüler (inç)
const OLCU = {
  W: S.genislik,
  H: S.yukseklik,
  M: S.kenar,                         // yan kenar boşluğu
  icW: S.genislik - 2 * S.kenar,      // içerik genişliği
  baslikY: S.baslikUst,
  icY: S.icerikUst,
  icAlt: 6.8,                         // içerik alt sınırı (altbilgiden önce)
  altbilgiY: S.altbilgiY,
};
OLCU.icH = OLCU.icAlt - OLCU.icY;

module.exports = { KOK, TEMA, R, F, PT, OLCU };
