// Slayt düzenleri (PowerPoint "layout"). Tasarım v2:
//  - Açık zemin = içerik (İÇERİK, İFADE, LAB), koyu zemin = geçiş (KAPAK, BÖLÜM).
//  - Kırmızı geniş alan olarak kullanılmaz; yalnızca vurgu çizgisi, numara ve etkin öğe.
//  - Altbilgi sade: yalnızca "H1 · n". Katman göstergesi sağ üstte ince 4 bölmeli çubuk.
const { TEMA, R, F, PT, OLCU } = require("./tema");

const DUZEN = {
  KAPAK: "IM Kapak",
  BOLUM: "IM Bölüm",
  ICERIK: "IM İçerik",
  IFADE: "IM İfade",
  LAB: "IM Lab",
};

// Sağ alt köşede ince katman göstergesi: "Bağlam ▬ ▬ ▬ ▬" (etkin bölme kırmızı)
function katmanGostergesi(aktif, { koyu = false } = {}) {
  if (aktif === null || aktif === undefined) return [];
  const n = TEMA.katmanlar.length, w = 0.34, gap = 0.06, h = 0.07;
  const sag = OLCU.W - OLCU.M;
  const x0 = sag - n * w - (n - 1) * gap;
  const y = OLCU.altbilgiY + 0.13;
  const nesneler = [{
    text: {
      text: TEMA.katmanlar[aktif],
      options: {
        x: x0 - 1.65, y: y - 0.16, w: 1.55, h: 0.36, align: "right", valign: "middle", margin: 0,
        fontFace: F.govde, fontSize: PT.altbilgi, color: koyu ? R.koyuIkincil : R.metinIkincil,
      },
    },
  }];
  for (let i = 0; i < n; i++) {
    const etkin = i === aktif;
    nesneler.push({ rect: { x: x0 + i * (w + gap), y, w, h, fill: { color: etkin ? R.kirmizi : (koyu ? R.koyuKart : R.cizgi) } } });
  }
  return nesneler;
}

function altbilgi(hafta, { koyu = false } = {}) {
  return [{
    text: {
      text: `H${hafta} ·`,
      options: {
        x: OLCU.M, y: OLCU.altbilgiY, w: 0.5, h: 0.32, fontFace: F.govde, fontSize: PT.altbilgi,
        color: koyu ? R.koyuIkincil : R.metinIkincil, margin: 0, valign: "middle",
      },
    },
  }];
}

function sayfaNo(koyu = false) {
  return {
    x: OLCU.M + 0.44, y: OLCU.altbilgiY, w: 0.6, h: 0.32,
    fontFace: F.govde, fontSize: PT.altbilgi, color: koyu ? R.koyuIkincil : R.metinIkincil, margin: 0, valign: "middle",
  };
}

function baslikYerTutucu(w = OLCU.icW) {
  return {
    placeholder: {
      options: {
        name: "title", type: "title",
        x: OLCU.M, y: OLCU.baslikY, w, h: 0.8,
        fontFace: F.baslik, fontSize: PT.baslik, bold: true, color: R.metin,
        align: "left", valign: "middle", margin: 0,
      },
      text: "",
    },
  };
}

function duzenleriTanimla(pres, { hafta, katman }) {
  // KAPAK — koyu zemin, solda ince kırmızı dikey çizgi
  pres.defineSlideMaster({
    title: DUZEN.KAPAK,
    background: { color: R.koyuZemin },
    objects: [{ rect: { x: OLCU.M, y: 1.0, w: 0.06, h: 5.5, fill: { color: R.kirmizi } } }],
  });

  // BÖLÜM — koyu zemin (geçiş slaytı)
  pres.defineSlideMaster({
    title: DUZEN.BOLUM,
    background: { color: R.koyuZemin },
    objects: [...altbilgi(hafta, { koyu: true }), ...katmanGostergesi(katman, { koyu: true })],
    slideNumber: sayfaNo(true),
  });

  // İÇERİK — açık zemin, başlık altında kısa kırmızı vurgu çizgisi
  pres.defineSlideMaster({
    title: DUZEN.ICERIK,
    background: { color: R.zemin },
    objects: [
      { rect: { x: OLCU.M, y: OLCU.baslikY + 0.9, w: 0.6, h: 0.06, fill: { color: R.kirmizi } } },
      ...altbilgi(hafta),
      ...katmanGostergesi(katman),
      baslikYerTutucu(),
    ],
    slideNumber: sayfaNo(),
  });

  // İFADE — içerikle aynı zemin; ayrımı soldaki kırmızı şerit ve tek büyük cümle sağlar
  pres.defineSlideMaster({
    title: DUZEN.IFADE,
    background: { color: R.zemin },
    objects: [{ rect: { x: 0, y: 0, w: 0.12, h: OLCU.H, fill: { color: R.kirmizi } } }, ...altbilgi(hafta), ...katmanGostergesi(katman)],
    slideNumber: sayfaNo(),
  });

  // LAB — açık zemin, lacivert-gri vurgu (teoriden ayrışsın)
  pres.defineSlideMaster({
    title: DUZEN.LAB,
    background: { color: R.zemin },
    objects: [
      { rect: { x: OLCU.M, y: OLCU.baslikY + 0.9, w: 0.6, h: 0.06, fill: { color: R.karsit } } },
      ...altbilgi(hafta),
      ...katmanGostergesi(katman),
      baslikYerTutucu(OLCU.icW - 1.3),
    ],
    slideNumber: sayfaNo(),
  });
}

// Kapak için büyük katman haritası (koyu zemin üzerinde)
function buyukHarita(aktif, x0, y) {
  const w = 1.5, h = 0.46, gap = 0.14;
  return TEMA.katmanlar.map((ad, i) => {
    const etkin = i === aktif;
    return {
      text: ad,
      options: {
        shape: "roundRect", rectRadius: 0.5, x: x0 + i * (w + gap), y, w, h,
        fill: { color: etkin ? R.kirmizi : R.koyuZemin }, line: { color: etkin ? R.kirmizi : R.koyuIkincil, width: 0.75 },
        color: etkin ? R.kart : R.koyuIkincil, bold: etkin, fontFace: F.govde, fontSize: 14,
        align: "center", valign: "middle", margin: 0,
      },
    };
  });
}

module.exports = { DUZEN, duzenleriTanimla, buyukHarita };
