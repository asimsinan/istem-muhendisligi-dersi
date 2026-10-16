// Basit Python sözdizimi renklendirme → pptxgenjs metin parçaları.
const { R, F, PT } = require("./tema");

const ANAHTAR = new Set(("False None True and as assert async await break class continue def del elif else except " +
  "finally for from global if import in is lambda nonlocal not or pass raise return try while with yield").split(" "));
const YERLESIK = new Set("print len range open dict list str int float json os".split(" "));

function satirParcala(satir) {
  const parcalar = [];
  const re = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|f?"[^"]*"|f?'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(satir)) !== null) {
    const [t, yorum, dize, sayi, ad] = m;
    let renk = R.kodMetin;
    if (yorum) renk = R.kodYorum;
    else if (dize) renk = R.kodDize;
    else if (sayi) renk = R.kodDize;
    else if (ad && ANAHTAR.has(ad)) renk = R.kodAnahtar;
    else if (ad && YERLESIK.has(ad)) renk = "F7A8B2";
    parcalar.push({ text: t, options: { color: renk, italic: !!yorum } });
  }
  return parcalar;
}

// font: varsayılan JetBrains Mono. "<|" gibi dizileri bitişik harfe (ligatür) çeviren durumlarda
// slayt kaydında `yazitipi: Consolas` verilebilir (ligatürü yok; Office ile gelir).
// punto: uzun kod için slayt kaydında `punto: 14` (varsayılan tema kod puntosu).
function kodParcalari(kod, vurguSatirlar = [], font = F.kod, punto = PT.kod) {
  const satirlar = kod.replace(/\s+$/, "").split("\n");
  const sonuc = [];
  satirlar.forEach((s, i) => {
    const parcalar = s.length ? satirParcala(s) : [{ text: " ", options: {} }];
    const vurgulu = vurguSatirlar.includes(i + 1);
    parcalar.forEach((p, j) => {
      p.options = { ...p.options, fontFace: font, fontSize: punto };
      if (vurgulu) p.options.highlight = R.kirmiziKoyu;
      if (j === parcalar.length - 1 && i < satirlar.length - 1) p.options.breakLine = true;
      sonuc.push(p);
    });
  });
  return { parcalar: sonuc, satirSayisi: satirlar.length };
}

module.exports = { kodParcalari };
