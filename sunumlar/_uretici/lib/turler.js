// Slayt türleri (tasarım v2). Her tür, slaytlar.yaml'daki bir kaydı bir (veya kademeli türlerde birkaç) slayta çevirir.
// Tasarım ilkeleri tasarim/tema.json "_ilkeler" alanında; özet:
//   gövde ≥ 24 pt, ikincil ≥ 18 pt · kırmızı yalnız vurgu · açık = içerik, koyu = geçiş · slayt başına tek fikir.
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { execFileSync } = require("child_process");
const { R, F, PT, OLCU } = require("./tema");
const { DUZEN, buyukHarita } = require("./duzenler");
const { ikon } = require("./ikon");
const { kodParcalari } = require("./kod");

const G = F.govde;
const B = F.baslik;
const SATIR = 1.15; // satır aralığı çarpanı
const tb = (o) => ({ fontFace: G, color: R.metin, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: SATIR, ...o });
const pt2in = (pt) => pt / 72;

// Metnin verilen genişlikte kaç satıra kırılacağını yaklaşık hesaplar (Inter için ortalama karakter ≈ 0.53 em)
function satirSay(metin, wIn, pt, ort = 0.48) {
  // Kelime kelime sarma benzetimi. Metin kutusu iç boşluğu ≈ 0.2 in; Inter ortalama karakter ≈ 0.48 em;
  // kalın metin için ort = 0.56 verin. Tahmin bilerek cömert: boşluk, üst üste binmekten iyidir.
  const kar = Math.max(1, (wIn - 0.2) / (pt * ort / 72));
  return String(metin).split("\n").reduce((t, p) => {
    let n = 1, uz = 0;
    for (const k of p.split(/\s+/).filter(Boolean)) {
      const l = k.length;
      if (uz === 0) uz = l; else if (uz + 1 + l <= kar) uz += 1 + l; else { n++; uz = l; }
      while (uz > kar) { n++; uz -= Math.floor(kar); }
    }
    return t + n;
  }, 0);
}
const satirYuk = (pt) => pt / 72 * 1.15 * 1.12;

function videoSuresiMs(dosya) {
  const cikti = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dosya]).toString().trim();
  return Math.round(parseFloat(cikti) * 1000);
}

// ---------- ortak yardımcılar ----------
function baslik(slayt, metin) {
  if (metin) slayt.addText(metin, { placeholder: "title" });
}

function kaynakSatiri(slayt, kaynak, koyu = false) {
  if (!kaynak) return;
  slayt.addText(`Kaynak: ${kaynak}`, tb({
    x: 1.6, y: OLCU.altbilgiY, w: OLCU.W - 1.6 - OLCU.M - 3.5, h: 0.32, fontSize: PT.altbilgi, italic: true,
    color: koyu ? R.koyuIkincil : R.metinIkincil, valign: "middle", align: "left",
  }));
}

function notlar(slayt, k, ek = "") {
  const parcalar = [`[${k.id}]`];
  if (k.not) parcalar.push(String(k.not).trim());
  if (ek) parcalar.push(ek);
  // konusma.yaml'dan gelen metin (build.js k._konusma olarak ekler): sunucu görünümünde okunur
  const km = k._konusma;
  if (km) {
    if (km.soyle) parcalar.push("\n— SÖYLEYİN —\n" + String(km.soyle).trim());
    if (km.sor) parcalar.push("\n— SORUN —\n" + String(km.sor).trim());
    if (km.beklenen && km.beklenen.length) parcalar.push("Beklenen cevaplar: " + km.beklenen.join(" · "));
    if (km.gecis) parcalar.push("\n— GEÇİŞ —\n" + String(km.gecis).trim());
  }
  slayt.addNotes(parcalar.join("\n"));
}

// Numara rozeti. Varsayılan: açık kırmızı zemin + kırmızı numara (sakin). etkin: dolu kırmızı.
function rozet(slayt, metin, x, y, { cap = 0.56, etkin = false, renkAile = "kirmizi", punto = 18, ad } = {}) {
  const ana = renkAile === "karsit" ? R.karsit : R.kirmizi;
  const acik = renkAile === "karsit" ? R.karsitAcik : R.notrKart;
  slayt.addText(String(metin), {
    shape: "ellipse", x, y, w: cap, h: cap,
    fill: { color: etkin ? ana : acik }, line: { color: etkin ? ana : acik, width: 0 },
    color: etkin ? R.kart : ana, bold: true, fontFace: G, fontSize: punto, align: "center", valign: "middle", margin: 0,
    ...(ad ? { objectName: ad } : {}),
  });
}

function kart(slayt, x, y, w, h, { dolgu = R.kart, kenar = R.cizgi, kalinlik = 0.75, ad } = {}) {
  slayt.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.1, fill: { color: dolgu }, line: { color: kenar, width: kalinlik },
    ...(ad ? { objectName: ad } : {}),
  });
}

function etiket(slayt, metin, x, y, w, renk = R.kirmizi) {
  slayt.addText(metin.toLocaleUpperCase("tr-TR"), tb({ x, y, w, h: 0.32, fontSize: PT.kucuk, bold: true, color: renk, charSpacing: 2, valign: "middle" }));
}

async function qrVeri(url) {
  const png = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M", margin: 1, width: 600, color: { dark: "#" + R.metin, light: "#" + R.kart },
  });
  return png.replace(/^data:/, "");
}

// Madde satırları: kısa kırmızı çizgi işaret; her madde kendi satır sayısı kadar yer kaplar (üst üste binmez)
function maddeSatirlari(slayt, liste, x, y, w, { punto = PT.govde, satirH = 0.85, isaret = R.kirmizi, renk = R.metin, bosluk } = {}) {
  const lh = satirYuk(punto);
  const gap = bosluk ?? Math.max(0.14, satirH - lh);
  let yy = y;
  liste.forEach((m) => {
    const h = satirSay(m, w - 0.36, punto) * lh;
    slayt.addShape("rect", { x, y: yy + pt2in(punto) * 0.62, w: 0.16, h: 0.05, fill: { color: isaret }, line: { color: isaret, width: 0 } });
    slayt.addText(String(m), tb({ x: x + 0.36, y: yy, w: w - 0.36, h: h + 0.05, fontSize: punto, color: renk }));
    yy += h + gap;
  });
  return yy;
}

// Numaralı adımlar: rozet + metin; uzun maddeler aşağıdakini itmez, alan açar
function numaraliAdimlar(slayt, liste, x, y, w, { punto = 22, bosluk = 0.28, cap = 0.5, renkAile = "kirmizi", rozetPunto = 16 } = {}) {
  const lh = satirYuk(punto);
  let yy = y;
  liste.forEach((a, i) => {
    const h = Math.max(cap, satirSay(a, w - cap - 0.25, punto) * lh);
    rozet(slayt, i + 1, x, yy + Math.min(0.02, h), { cap, punto: rozetPunto, renkAile });
    slayt.addText(String(a), tb({ x: x + cap + 0.25, y: yy + 0.04, w: w - cap - 0.25, h: h, fontSize: punto }));
    yy += h + bosluk;
  });
  return yy;
}

// ---------- türler ----------
const TURLER = {};

TURLER.kapak = async (pres, k, ctx) => {
  const s = pres.addSlide({ masterName: DUZEN.KAPAK });
  const x = OLCU.M + 0.45;
  // Büyük hafta numarası sağ altta, zemine yakın tonda (dekoratif, metinle çakışmaz)
  s.addText(String(ctx.hafta).padStart(2, "0"), tb({
    x: OLCU.W - 5.2, y: 4.15, w: 4.6, h: 3.1, fontFace: B, fontSize: 210, bold: true, color: R.koyuKart, align: "right", valign: "bottom", lineSpacingMultiple: 0.9,
  }));
  s.addText([
    { text: "İSTEM MÜHENDİSLİĞİ", options: { bold: true, color: R.koyuMetin } },
    { text: "   ·   Hafta " + ctx.hafta, options: { color: R.koyuIkincil } },
  ], tb({ x, y: 1.0, w: 7, h: 0.4, fontSize: PT.kucuk, charSpacing: 2, valign: "middle" }));
  if (k.yazar) s.addText(k.yazar, tb({ x: OLCU.W - OLCU.M - 5.0, y: 1.0, w: 5.0, h: 0.4, fontSize: PT.kucuk, color: R.koyuIkincil, align: "right", valign: "middle" }));
  if (k.ust) s.addText(k.ust, tb({ x, y: 2.1, w: 9, h: 0.45, fontSize: PT.ikincil, bold: true, color: R.kirmiziParlak }));
  s.addText(k.baslik, tb({ x, y: 2.6, w: 10.5, h: 1.75, fontFace: B, fontSize: PT.kapakBaslik, bold: true, color: R.koyuMetin, lineSpacingMultiple: 1.0 }));
  if (k.alt) s.addText(k.alt, tb({ x, y: 4.4, w: 8.2, h: 0.95, fontSize: PT.altBaslik, color: R.koyuIkincil }));
  buyukHarita(ctx.katman, x, 5.95).forEach((n) => s.addText(n.text, n.options));
  notlar(s, k);
  return [s];
};

TURLER.bolum = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.BOLUM });
  const x = OLCU.M + 0.45;
  s.addShape("rect", { x: OLCU.M, y: 2.3, w: 0.06, h: 2.6, fill: { color: R.kirmizi }, line: { width: 0, color: R.kirmizi } });
  if (k.no) s.addText(k.no.toLocaleUpperCase("tr-TR"), tb({ x, y: 2.3, w: 10, h: 0.4, fontSize: PT.kucuk, bold: true, color: R.kirmiziParlak, charSpacing: 3, valign: "middle" }));
  s.addText(k.baslik, tb({ x, y: 2.8, w: 11, h: 1.35, fontFace: B, fontSize: PT.bolumBaslik, bold: true, color: R.koyuMetin, valign: "middle", lineSpacingMultiple: 1.0 }));
  if (k.alt) s.addText(k.alt, tb({ x, y: 4.25, w: 11, h: 0.65, fontSize: PT.altBaslik, color: R.koyuIkincil }));
  kaynakSatiri(s, k.kaynak, true);
  notlar(s, k);
  return [s];
};

TURLER.ifade = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.IFADE });
  const x = 1.25, w = OLCU.W - x - 1.25;
  if (k.etiket) etiket(s, k.etiket, x, 1.55, w);
  s.addText(k.metin, tb({ x, y: 2.0, w, h: 2.8, fontFace: B, fontSize: PT.ifade, bold: true, valign: "middle", lineSpacingMultiple: 1.05 }));
  if (k.alt) s.addText(k.alt, tb({ x, y: 5.05, w, h: 0.9, fontSize: PT.altBaslik, color: R.metinIkincil }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER.liste = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const y0 = OLCU.icY + 0.2;
  if (k.numarali) numaraliAdimlar(s, k.maddeler, OLCU.M, y0, OLCU.icW, { punto: PT.govde, bosluk: 0.32, cap: 0.56, rozetPunto: 18 });
  else maddeSatirlari(s, k.maddeler, OLCU.M + 0.05, y0, OLCU.icW - 0.05, { punto: PT.govde, bosluk: 0.38 });
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER.kavram = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const solW = 6.9, y0 = OLCU.icY + 0.15;
  etiket(s, "Tanım", OLCU.M, y0, solW);
  // Tanım uzunsa punto küçülür (26 → 22); örnek bloğu tanımın hemen altından başlar
  let tp = 26;
  while (tp > 22 && satirSay(k.tanim, solW, tp) * satirYuk(tp) > 2.2) tp -= 1;
  const tanimH = satirSay(k.tanim, solW, tp) * satirYuk(tp);
  s.addText(k.tanim, tb({ x: OLCU.M, y: y0 + 0.4, w: solW, h: tanimH + 0.05, fontSize: tp }));
  if (k.ornek) {
    const oy = Math.max(y0 + 2.75, y0 + 0.4 + tanimH + 0.3);
    etiket(s, "Örnek", OLCU.M, oy, solW);
    s.addText(k.ornek, tb({ x: OLCU.M, y: oy + 0.4, w: solW, h: Math.max(1.0, y0 + 5.0 - oy - 0.4), fontSize: PT.altBaslik, color: R.metinIkincil }));
  }
  const kx = OLCU.M + solW + 0.55, kw = OLCU.W - OLCU.M - kx;
  kart(s, kx, y0, kw, 5.0, { dolgu: R.notrKart, kenar: R.notrKart });
  s.addImage({ data: await ikon("lightbulb", R.kirmizi, 256, 1.75), x: kx + 0.4, y: y0 + 0.38, w: 0.5, h: 0.5 });
  s.addText("Gündelik benzetme", tb({ x: kx + 1.05, y: y0 + 0.38, w: kw - 1.3, h: 0.5, fontSize: PT.ikincil, bold: true, color: R.kirmizi, valign: "middle" }));
  s.addText(k.benzetme, tb({ x: kx + 0.4, y: y0 + 1.15, w: kw - 0.8, h: 3.6, fontSize: PT.altBaslik }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER["iki-kolon"] = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const gap = 0.4, w = (OLCU.icW - gap) / 2, y = OLCU.icY + 0.15, h = 5.0;
  // En kalabalık sütun karta sığana kadar puntoyu küçült (22 → 18)
  const yuk = (kol, p) => kol.maddeler.reduce((t, m) => t + satirSay(m, w - 1.26, p) * satirYuk(p) + 0.24, 0);
  let pk = 22;
  while (pk > 18 && Math.max(yuk(k.sol, pk), yuk(k.sag, pk)) > h - 1.75) pk -= 1;
  [k.sol, k.sag].forEach((kol, i) => {
    const x = OLCU.M + i * (w + gap);
    const vurgu = i === 0 ? R.kirmizi : R.karsit;
    kart(s, x, y, w, h);
    s.addShape("rect", { x: x + 0.45, y: y + 0.42, w: 0.6, h: 0.06, fill: { color: vurgu }, line: { color: vurgu, width: 0 } });
    s.addText(kol.baslik, tb({ x: x + 0.45, y: y + 0.6, w: w - 0.9, h: 0.6, fontFace: B, fontSize: 24, bold: true, color: vurgu, valign: "middle" }));
    maddeSatirlari(s, kol.maddeler, x + 0.45, y + 1.5, w - 0.9, { punto: pk, bosluk: 0.24, isaret: vurgu });
  });
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

// Tablo: dikey çizgi yok, başlık altında kırmızı çizgi, satır altlarında ince çizgi ("editoryal" tablo)
TURLER.tablo = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const yok = { type: "none" };
  const ince = { type: "solid", pt: 0.75, color: R.cizgi };
  const kalin = { type: "solid", pt: 2, color: R.kirmizi };
  const satirlar = [
    k.basliklar.map((b) => ({ text: b, options: { bold: true, color: R.metinIkincil, fontSize: PT.kucuk + 1, border: [yok, yok, kalin, yok], fill: { color: R.zemin } } })),
    ...k.satirlar.map((satir) => satir.map((h, c) => ({
      text: String(h),
      options: { fontSize: PT.ikincil, color: c === 0 ? R.metin : R.metin, bold: c === 0, border: [yok, yok, ince, yok], fill: { color: R.zemin } },
    }))),
  ];
  const ncol = k.basliklar.length;
  // Satır yüksekliği: alt cümle varsa ona yer bırakacak kadar küçülür (0.52–0.66)
  const rowH = Math.max(0.52, Math.min(0.66, (6.25 - OLCU.icY - 0.25 - (k.alt ? 0.75 : 0)) / (k.satirlar.length + 1)));
  const genislikler = k.genislikler || Array(ncol).fill(OLCU.icW / ncol);
  const toplam = genislikler.reduce((a, b) => a + b, 0);
  s.addTable(satirlar, {
    x: OLCU.M, y: OLCU.icY + 0.25, w: OLCU.icW, colW: genislikler.map((g) => g * OLCU.icW / toplam), fontFace: G,
    margin: [0.1, 0.12, 0.1, 0.0], valign: "middle", rowH,
  });
  if (k.alt) {
    const yAlt = OLCU.icY + 0.25 + (k.satirlar.length + 1) * rowH + 0.25;
    s.addText(k.alt, tb({ x: OLCU.M, y: yAlt, w: OLCU.icW, h: 0.6, fontSize: PT.ikincil, bold: true, color: R.kirmiziKoyu }));
  }
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER.kod = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const kodPunto = k.punto || PT.kod;
  const { parcalar, satirSayisi } = kodParcalari(k.kod, k.vurgu || [], k.yazitipi, kodPunto);
  const kw = 7.6, ky = OLCU.icY + 0.1;
  const satirIn = pt2in(kodPunto) * 1.25;
  const kh = Math.min(5.1, satirSayisi * satirIn + 0.85);
  kart(s, OLCU.M, ky, kw, kh, { dolgu: R.kodZemin, kenar: R.kodZemin });
  s.addText((k.dil || "python").toLocaleUpperCase("tr-TR"), tb({ x: OLCU.M + 0.35, y: ky + 0.18, w: 2, h: 0.25, fontSize: 11, bold: true, color: R.kodYorum, charSpacing: 2 }));
  s.addText(parcalar, { x: OLCU.M + 0.35, y: ky + 0.55, w: kw - 0.7, h: kh - 0.7, margin: 0, valign: "top", isTextBox: true, lineSpacingMultiple: 1.1 });
  const ax = OLCU.M + kw + 0.45, aw = OLCU.W - OLCU.M - ax;
  const aciklamalar = k.aciklama || [];
  const adimH = Math.min(1.6, 5.0 / Math.max(1, aciklamalar.length));
  aciklamalar.forEach((a, i) => {
    const y = ky + i * adimH;
    rozet(s, i + 1, ax, y, { cap: 0.44, punto: 14 });
    s.addText(a, tb({ x: ax + 0.6, y: y + 0.02, w: aw - 0.6, h: adimH - 0.1, fontSize: PT.ikincil }));
  });
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER.video = async (pres, k, ctx) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const vh = 4.45, vw = vh * 16 / 9, vx = (OLCU.W - vw) / 2, vy = OLCU.icY + 0.05;
  const dosya = path.resolve(ctx.desteDizin, k.dosya);
  const kapakYol = k.kapak ? path.resolve(ctx.desteDizin, k.kapak) : null;
  if (!fs.existsSync(dosya)) {
    if (!k.yer_tutucu) throw new Error(`Video bulunamadı: ${dosya}`);
    // Taslak aşaması: video henüz üretilmedi → kesik çizgili yer tutucu
    s.addShape("roundRect", { x: vx, y: vy, w: vw, h: vh, rectRadius: 0.1, fill: { color: R.notrKart }, line: { color: R.pasif, width: 1.5, dashType: "dash" } });
    s.addImage({ data: await ikon("clapperboard", R.metinIkincil, 256, 1.5), x: OLCU.W / 2 - 0.4, y: vy + vh / 2 - 1.0, w: 0.8, h: 0.8 });
    s.addText([{ text: "Video hazırlanacak", options: { bold: true, breakLine: true, fontSize: 22, color: R.metin } }, { text: k.yer_tutucu, options: { fontSize: PT.ikincil, color: R.metinIkincil } }],
      tb({ x: vx + 0.5, y: vy + vh / 2, w: vw - 1, h: 1.3, align: "center" }));
    if (k.ipucu) s.addText([{ text: "Neye bakmalı?  ", options: { bold: true, color: R.kirmizi } }, { text: k.ipucu, options: {} }], tb({ x: vx, y: vy + vh + 0.18, w: vw, h: 0.62, fontSize: PT.ikincil }));
    kaynakSatiri(s, k.kaynak);
    notlar(s, k, "(TASLAK: video henüz üretilmedi.)");
    return [s];
  }
  kart(s, vx - 0.05, vy - 0.05, vw + 0.1, vh + 0.1, { dolgu: R.kart, kenar: R.cizgi });
  const secenek = { type: "video", path: dosya, x: vx, y: vy, w: vw, h: vh, objectName: `video-${k.id}` };
  if (kapakYol) secenek.cover = "data:image/png;base64," + fs.readFileSync(kapakYol).toString("base64");
  s.addMedia(secenek);
  if (k.ipucu) {
    s.addImage({ data: await ikon("eye", R.kirmizi, 256, 1.75), x: vx, y: vy + vh + 0.22, w: 0.32, h: 0.32 });
    s.addText([{ text: "Neye bakmalı?  ", options: { bold: true, color: R.kirmizi } }, { text: k.ipucu, options: {} }],
      tb({ x: vx + 0.45, y: vy + vh + 0.18, w: vw - 0.45, h: 0.62, fontSize: PT.ikincil }));
  }
  ctx.sonIslem.push({
    tur: "video", oynat: k.oynat || "otomatik", slaytNo: ctx.sayac(), sureMs: videoSuresiMs(dosya),
    duraklatma: k.duraklatma !== false,
  });
  kaynakSatiri(s, k.kaynak);
  notlar(s, k, (k.oynat || "otomatik") === "otomatik" ? "(Video slayt açılınca kendiliğinden başlar; üzerine tıklayınca durur/devam eder.)" : "(Videoyu başlatmak için üzerine tıklayın.)");
  return [s];
};

// Kademeli akış: her adım ayrı slaytta belirir; slaytlar arası Morph geçişi.
TURLER.akis = async (pres, k, ctx) => {
  const adimlar = k.adimlar;
  const n = adimlar.length;
  const gap = 0.5, w = (OLCU.icW - (n - 1) * gap) / n, y = 2.75, h = 1.35;
  const kademeli = k.kademeli !== false;
  const slaytlar = [];
  const asamalar = kademeli ? [...Array(n).keys()].map((i) => i + 1) : [n];
  for (const goster of asamalar) {
    const s = pres.addSlide({ masterName: DUZEN.ICERIK });
    baslik(s, k.baslik);
    for (let i = 0; i < goster; i++) {
      const x = OLCU.M + i * (w + gap);
      // kademeli: yalnız son eklenen etkin; değilse k.etkin (0 tabanlı) verilmişse yalnız o, verilmemişse hepsi
      const aktif = kademeli ? i === goster - 1 : (k.etkin == null || k.etkin === i);
      rozet(s, i + 1, x, y - 0.7, { cap: 0.46, punto: 15, etkin: aktif, ad: `!!akis-no-${i}` });
      s.addText(adimlar[i].ad, {
        shape: "roundRect", rectRadius: 0.1, x, y, w, h,
        fill: { color: aktif ? R.notrKart : R.kart }, line: { color: aktif ? R.kirmizi : R.cizgi, width: aktif ? 1.5 : 0.75 },
        color: aktif ? R.kirmizi : R.metin, bold: true, fontFace: B, fontSize: 24, align: "center", valign: "middle", margin: 0.08,
        objectName: `!!akis-kutu-${i}`,
      });
      if (adimlar[i].aciklama) {
        s.addText(adimlar[i].aciklama, tb({ x, y: y + h + 0.25, w, h: 1.6, fontSize: PT.ikincil, color: R.metinIkincil, objectName: `!!akis-ack-${i}` }));
      }
      if (i < goster - 1) {
        s.addShape("line", {
          x: x + w + 0.08, y: y + h / 2, w: gap - 0.16, h: 0,
          line: { color: R.pasif, width: 1.75, endArrowType: "triangle" }, objectName: `!!akis-ok-${i}`,
        });
      }
    }
    if (k.alt && goster === n) {
      s.addText(k.alt, tb({ x: OLCU.M, y: 6.15, w: OLCU.icW, h: 0.55, fontSize: PT.altBaslik, bold: true, color: R.kirmiziKoyu, objectName: "!!akis-alt" }));
    }
    const no = ctx.sayac();
    if (kademeli && goster > 1) ctx.sonIslem.push({ tur: "morph", slaytNo: no });
    kaynakSatiri(s, k.kaynak);
    notlar(s, { ...k, id: `${k.id}#${goster}` }, kademeli ? `(Kademeli slayt ${goster}/${n})` : "");
    slaytlar.push(s);
  }
  return slaytlar;
};

TURLER.interaktif = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const q = 3.4, qx = OLCU.M + 0.3, qy = OLCU.icY + 0.35;
  kart(s, OLCU.M, OLCU.icY + 0.05, q + 0.6, q + 1.2, { dolgu: R.kart, kenar: R.cizgi });
  s.addImage({ data: await qrVeri(k.url), x: qx, y: qy, w: q, h: q });
  const kisa = k.kisa_url || k.url.replace(/^https?:\/\//, "");
  s.addText(kisa, tb({ x: OLCU.M, y: qy + q + 0.2, w: q + 0.6, h: 0.4, fontSize: kisa.length > 34 ? 11 : PT.kucuk, bold: true, color: R.kirmizi, align: "center", valign: "middle", hyperlink: { url: k.url } }));
  const ax = OLCU.M + q + 1.2, aw = OLCU.W - OLCU.M - ax;
  etiket(s, "Sayfada ne yapacaksınız?", ax, OLCU.icY + 0.1, aw);
  (k.adimlar || []).forEach((a, i) => {
    const y = OLCU.icY + 0.7 + i * 1.2;
    rozet(s, i + 1, ax, y, { cap: 0.52, punto: 17 });
    s.addText(a, tb({ x: ax + 0.8, y: y + 0.04, w: aw - 0.8, h: 1.1, fontSize: 22 }));
  });
  if (k.sure) s.addText(`Süre: ${k.sure}`, tb({ x: ax, y: 6.3, w: aw, h: 0.4, fontSize: PT.ikincil, color: R.metinIkincil }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k, `(Link: ${k.url})`);
  return [s];
};

TURLER.kontrol = async (pres, k, ctx) => {
  const harfler = ["A", "B", "C", "D"];
  const asamalar = k.cevap_slayti ? [false, true] : [false];
  const slaytlar = [];
  for (const cevap of asamalar) {
    const s = pres.addSlide({ masterName: DUZEN.ICERIK });
    const anket = k.dogru === undefined || k.dogru === null;
    baslik(s, k.baslik || (anket ? "Hızlı oylama" : "Kendini yokla"));
    s.addText(k.soru, tb({ x: OLCU.M, y: OLCU.icY + 0.1, w: OLCU.icW, h: 1.1, fontFace: B, fontSize: 28, bold: true, objectName: "!!kontrol-soru" }));
    const gap = 0.35, w = (OLCU.icW - gap) / 2, h = 1.25;
    for (let i = 0; i < k.secenekler.length; i++) {
      const sec = k.secenekler[i];
      const x = OLCU.M + (i % 2) * (w + gap), y = 3.0 + Math.floor(i / 2) * (h + 0.3);
      const dogru = i === k.dogru;
      const dolgu = cevap && dogru ? R.notrKart : R.kart;
      const kenar = cevap && dogru ? R.kirmizi : R.cizgi;
      const renk = cevap ? (dogru ? R.metin : R.pasif) : R.metin;
      kart(s, x, y, w, h, { dolgu, kenar, kalinlik: cevap && dogru ? 2 : 0.75, ad: `!!kontrol-kart-${i}` });
      s.addText(harfler[i], tb({ x: x + 0.35, y, w: 0.5, h, fontFace: B, fontSize: 26, bold: true, color: cevap && !dogru ? R.pasif : R.kirmizi, valign: "middle", objectName: `!!kontrol-harf-${i}` }));
      s.addText(sec, tb({ x: x + 0.95, y, w: w - (cevap && dogru ? 1.75 : 1.2), h, fontSize: 20, color: renk, valign: "middle", objectName: `!!kontrol-sec-${i}` }));
      if (cevap && dogru) s.addImage({ data: await ikon("circle-check", R.kirmizi, 256, 2), x: x + w - 0.75, y: y + h / 2 - 0.25, w: 0.5, h: 0.5, objectName: "!!kontrol-tik" });
    }
    if (anket) {
      s.addImage({ data: await ikon("hand", R.kirmizi, 256, 1.75), x: OLCU.M, y: 6.1, w: 0.4, h: 0.4 });
      s.addText(k.yonerge || "El kaldırarak oylayın. Şimdilik doğru cevabı söylemiyoruz.", tb({ x: OLCU.M + 0.55, y: 6.08, w: OLCU.icW - 0.55, h: 0.45, fontSize: PT.ikincil, color: R.metinIkincil, valign: "middle" }));
    }
    if (cevap && k.aciklama) {
      s.addText(k.aciklama, tb({ x: OLCU.M, y: 5.95, w: OLCU.icW, h: 0.8, fontSize: PT.ikincil, color: R.kirmiziKoyu, objectName: "!!kontrol-ack" }));
    }
    const no = ctx.sayac();
    if (cevap) ctx.sonIslem.push({ tur: "morph", slaytNo: no });
    kaynakSatiri(s, k.kaynak);
    notlar(s, { ...k, id: `${k.id}${cevap ? "#cevap" : ""}` }, cevap ? "" : (k.cevap_slayti ? "(Öğrencilere 1 dk verin, sonra sonraki slaytta cevap gelir.)" : ""));
    slaytlar.push(s);
  }
  return slaytlar;
};

TURLER.mola = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.BOLUM });
  s.addImage({ data: await ikon("coffee", R.kirmiziParlak, 256, 1.5), x: OLCU.W / 2 - 0.55, y: 1.7, w: 1.1, h: 1.1 });
  s.addText("Mola", tb({ x: 0, y: 2.95, w: OLCU.W, h: 1.1, fontFace: B, fontSize: 64, bold: true, color: R.koyuMetin, align: "center", valign: "middle" }));
  s.addText(`${k.dakika || 10} dakika`, tb({ x: 0, y: 4.05, w: OLCU.W, h: 0.55, fontSize: PT.govde, color: R.koyuIkincil, align: "center" }));
  if (k.metin) s.addText(k.metin, tb({ x: 2, y: 5.0, w: OLCU.W - 4, h: 0.8, fontSize: PT.ikincil, color: R.koyuIkincil, align: "center" }));
  notlar(s, k);
  return [s];
};

TURLER.lab = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.LAB });
  baslik(s, k.baslik);
  s.addText("LAB", {
    shape: "roundRect", rectRadius: 0.5, x: OLCU.W - OLCU.M - 0.95, y: OLCU.baslikY + 0.21, w: 0.95, h: 0.38,
    fill: { color: R.karsitAcik }, line: { color: R.karsitAcik, width: 0 }, color: R.karsit, bold: true, fontFace: G, fontSize: 13,
    align: "center", valign: "middle", margin: 0, charSpacing: 2,
  });
  const solW = 8.0, y0 = OLCU.icY + 0.1;
  etiket(s, "Hedef", OLCU.M, y0, solW, R.karsit);
  s.addText(k.hedef, tb({ x: OLCU.M, y: y0 + 0.38, w: solW, h: 0.95, fontSize: 20 }));
  numaraliAdimlar(s, k.adimlar || [], OLCU.M, y0 + 1.4, solW, { punto: 19, bosluk: 0.16, cap: 0.42, rozetPunto: 14, renkAile: "karsit" });
  const kx = OLCU.M + solW + 0.45, kw = OLCU.W - OLCU.M - kx;
  kart(s, kx, y0, kw, 5.0, { dolgu: R.kart, kenar: R.cizgi });
  s.addImage({ data: await ikon("list-checks", R.karsit, 256, 1.75), x: kx + 0.35, y: y0 + 0.35, w: 0.45, h: 0.45 });
  s.addText("Teslim kriteri", tb({ x: kx + 0.95, y: y0 + 0.35, w: kw - 1.2, h: 0.45, fontSize: PT.ikincil, bold: true, color: R.karsit, valign: "middle" }));
  const sonY = maddeSatirlari(s, k.teslim || [], kx + 0.35, y0 + 1.1, kw - 0.7, { punto: 17, bosluk: 0.16, isaret: R.karsit });
  if (k.sure) s.addText(k.sure, tb({ x: kx + 0.35, y: Math.max(sonY + 0.1, y0 + 3.9), w: kw - 0.7, h: 0.9, fontSize: 15, bold: true, color: R.karsit }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

TURLER.sozluk = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik || "Bu haftanın sözlüğü");
  const gap = 0.35, w = (OLCU.icW - gap) / 2, h = 1.48, y0 = OLCU.icY + 0.1;
  k.terimler.forEach((t, i) => {
    const x = OLCU.M + (i % 2) * (w + gap), y = y0 + Math.floor(i / 2) * (h + 0.2);
    kart(s, x, y, w, h);
    s.addText([
      { text: t.tr, options: { bold: true, color: R.kirmizi, fontSize: 22 } },
      { text: `   ${t.en}`, options: { italic: true, color: R.metinIkincil, fontSize: 16 } },
    ], tb({ x: x + 0.35, y: y + 0.18, w: w - 0.7, h: 0.45, valign: "middle" }));
    s.addText(t.tanim, tb({ x: x + 0.35, y: y + 0.7, w: w - 0.7, h: h - 0.78, fontSize: PT.ikincil }));
  });
  notlar(s, k);
  return [s];
};

TURLER.ozet = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik || "Bugün ne öğrendik?");
  const n = k.maddeler.length, gap = 0.4, w = (OLCU.icW - (n - 1) * gap) / n, y0 = OLCU.icY + 0.15;
  k.maddeler.forEach((m, i) => {
    const x = OLCU.M + i * (w + gap);
    kart(s, x, y0, w, 4.3);
    s.addText(String(i + 1).padStart(2, "0"), tb({ x: x + 0.4, y: y0 + 0.35, w: w - 0.8, h: 0.9, fontFace: B, fontSize: 44, bold: true, color: R.kirmizi }));
    s.addText(m, tb({ x: x + 0.4, y: y0 + 1.45, w: w - 0.8, h: 3.0, fontSize: 22 }));
  });
  notlar(s, k);
  return [s];
};

TURLER.kaynak = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik || "Kaynaklar");
  const lw = k.qr ? 8.4 : OLCU.icW, y0 = OLCU.icY + 0.1;
  k.kaynaklar.forEach((r, i) => {
    const satirH = Math.min(1.1, 5.0 / k.kaynaklar.length);
    const y = y0 + i * satirH;
    s.addShape("rect", { x: OLCU.M, y: y + 0.08, w: 0.06, h: 0.78, fill: { color: R.kirmizi }, line: { width: 0, color: R.kirmizi } });
    s.addText([
      { text: r.ad, options: { bold: true, fontSize: 20, breakLine: true, hyperlink: r.url ? { url: r.url } : undefined, color: R.metin } },
      { text: [r.tur, r.tarih].filter(Boolean).join(" · "), options: { fontSize: PT.kucuk + 1, color: R.metinIkincil } },
    ], tb({ x: OLCU.M + 0.35, y, w: lw - 0.35, h: 0.95 }));
  });
  if (k.qr) {
    const qx = OLCU.W - OLCU.M - 3.2;
    kart(s, qx, y0, 3.2, 3.8);
    s.addImage({ data: await qrVeri(k.qr), x: qx + 0.3, y: y0 + 0.3, w: 2.6, h: 2.6 });
    s.addText("Tüm bağlantılar", tb({ x: qx, y: y0 + 3.1, w: 3.2, h: 0.4, fontSize: PT.kucuk, bold: true, color: R.kirmizi, align: "center", valign: "middle" }));
  }
  notlar(s, k);
  return [s];
};

// Etkinlik: sınıf içi kısa uygulama (telefonla deney, ikili tartışma). İsteğe bağlı kopyalanacak istem kutusu.
TURLER.etkinlik = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const y0 = OLCU.icY + 0.1;
  const istemVar = Boolean(k.istem);
  const solW = istemVar ? 6.2 : OLCU.icW;
  let yy = y0;
  if (k.sure) {
    s.addImage({ data: await ikon("timer", R.kirmizi, 256, 1.75), x: OLCU.M, y: yy, w: 0.38, h: 0.38 });
    s.addText(k.sure, tb({ x: OLCU.M + 0.5, y: yy - 0.02, w: solW - 0.5, h: 0.42, fontSize: PT.ikincil, bold: true, color: R.kirmizi, valign: "middle" }));
    yy += 0.5;
  }
  if (k.kim) {
    const h = satirSay(k.kim, solW, PT.ikincil) * satirYuk(PT.ikincil);
    s.addText(k.kim, tb({ x: OLCU.M, y: yy, w: solW, h, fontSize: PT.ikincil, color: R.metinIkincil }));
    yy += h;
  }
  numaraliAdimlar(s, k.adimlar || [], OLCU.M, yy + 0.3, solW, { punto: 22, bosluk: 0.3 });
  if (istemVar) {
    const kx = OLCU.M + solW + 0.45, kw = OLCU.W - OLCU.M - kx;
    kart(s, kx, y0, kw, 5.0, { dolgu: R.notrKart, kenar: R.notrKart });
    etiket(s, "İstem", kx + 0.35, y0 + 0.3, kw - 0.7);
    s.addText(k.istem.trim(), tb({ x: kx + 0.35, y: y0 + 0.75, w: kw - 0.7, h: 3.75, fontFace: F.kod, fontSize: k.istem.length > 380 ? 12 : k.istem.length > 240 ? 14 : PT.ikincil, lineSpacingMultiple: 1.15 }));
    if (k.istem_not) s.addText(k.istem_not, tb({ x: kx + 0.35, y: y0 + 4.5, w: kw - 0.7, h: 0.35, fontSize: 13, italic: true, color: R.metinIkincil }));
  }
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

// Zaman çizelgesi: yatay çizgi üzerinde yıllar; üstte yıl, altta olay ve kısa not
TURLER.zaman_cizelgesi = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const n = k.olaylar.length;
  const cizgiY = 3.05, adim = OLCU.icW / n;
  s.addShape("line", { x: OLCU.M, y: cizgiY, w: OLCU.icW, h: 0, line: { color: R.cizgi, width: 2 } });
  k.olaylar.forEach((o, i) => {
    const cx = OLCU.M + adim * i + adim / 2;
    const vurgu = Boolean(o.vurgu);
    s.addText(String(o.yil), tb({ x: cx - adim / 2, y: cizgiY - 0.85, w: adim, h: 0.5, fontFace: B, fontSize: 22, bold: true, color: vurgu ? R.kirmizi : R.metin, align: "center", valign: "bottom" }));
    s.addShape("ellipse", { x: cx - 0.12, y: cizgiY - 0.12, w: 0.24, h: 0.24, fill: { color: vurgu ? R.kirmizi : R.kart }, line: { color: vurgu ? R.kirmizi : R.metinIkincil, width: 1.5 } });
    s.addText(o.ad, tb({ x: cx - adim / 2 + 0.04, y: cizgiY + 0.35, w: adim - 0.08, h: 0.95, fontSize: 15, bold: true, align: "center" }));
    if (o.not) s.addText(o.not, tb({ x: cx - adim / 2 + 0.06, y: cizgiY + 1.3, w: adim - 0.12, h: 1.9, fontSize: 14, color: R.metinIkincil, align: "center" }));
  });
  if (k.alt) s.addText(k.alt, tb({ x: OLCU.M, y: 6.2, w: OLCU.icW, h: 0.5, fontSize: PT.ikincil, bold: true, color: R.kirmiziKoyu }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

// Katman haritası: dört katman sütunu ve her katmana düşen haftalar (dersin izlencesi)
TURLER.katman_haritasi = async (pres, k, ctx) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik || "Dönem haritası");
  const n = k.katmanlar.length, gap = 0.3, w = (OLCU.icW - (n - 1) * gap) / n, y0 = OLCU.icY + 0.1;
  const enCok = Math.max(...k.katmanlar.map((kt) => (kt.haftalar || []).length));
  const h = Math.max(3.4, 1.8 + enCok * 0.52 + 0.12);
  k.katmanlar.forEach((kat, i) => {
    const x = OLCU.M + i * (w + gap);
    kart(s, x, y0, w, h);
    s.addShape("rect", { x: x + 0.3, y: y0 + 0.3, w: 0.5, h: 0.06, fill: { color: R.kirmizi }, line: { width: 0, color: R.kirmizi } });
    s.addText(kat.ad, tb({ x: x + 0.3, y: y0 + 0.45, w: w - 0.6, h: 0.5, fontFace: B, fontSize: 24, bold: true, valign: "middle" }));
    if (kat.soru) s.addText(kat.soru, tb({ x: x + 0.3, y: y0 + 0.95, w: w - 0.6, h: 0.75, fontSize: 15, color: R.metinIkincil }));
    (kat.haftalar || []).forEach((hf, j) => {
      const yy = y0 + 1.8 + j * 0.52;
      const buHafta = ctx && hf.no === ctx.hafta;
      s.addText([{ text: `H${hf.no}  `, options: { bold: true, color: R.kirmizi } }, { text: hf.ad, options: { color: R.metin } }],
        { shape: "roundRect", rectRadius: 0.3, x: x + 0.25, y: yy, w: w - 0.5, h: 0.42, fill: { color: buHafta ? R.notrKart : R.kart }, line: { color: buHafta ? R.kirmizi : R.cizgi, width: buHafta ? 1.25 : 0.75 }, fontFace: G, fontSize: 14, valign: "middle", margin: [0, 0.12, 0, 0.12] });
    });
  });
  if (k.ek) s.addText(k.ek, tb({ x: OLCU.M, y: y0 + h + 0.25, w: OLCU.icW, h: 0.5, fontSize: PT.ikincil, color: R.metinIkincil }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

// Sayılar: büyük sayı kartları (değerlendirme oranları vb.)
TURLER.sayilar = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const n = k.ogeler.length, gap = 0.4, w = (OLCU.icW - (n - 1) * gap) / n, y0 = OLCU.icY + 0.2, h = 3.9;
  k.ogeler.forEach((o, i) => {
    const x = OLCU.M + i * (w + gap);
    kart(s, x, y0, w, h);
    s.addText(String(o.sayi), tb({ x: x + 0.4, y: y0 + 0.35, w: w - 0.8, h: 1.2, fontFace: B, fontSize: 60, bold: true, color: R.kirmizi, valign: "middle" }));
    const adH = satirSay(o.ad, w - 0.8, 24, 0.56) * satirYuk(24);
    s.addText(o.ad, tb({ x: x + 0.4, y: y0 + 1.65, w: w - 0.8, h: adH, fontSize: 24, bold: true }));
    if (o.aciklama) s.addText(o.aciklama, tb({ x: x + 0.4, y: y0 + 1.75 + adH, w: w - 0.8, h: 1.6, fontSize: PT.ikincil, color: R.metinIkincil }));
  });
  if (k.alt) s.addText(k.alt, tb({ x: OLCU.M, y: y0 + h + 0.3, w: OLCU.icW, h: 0.55, fontSize: PT.ikincil, color: R.metinIkincil }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

// Token görünümü: her satır bir metnin token'lara bölünmüş hâli (renkli çipler) + token sayısı
TURLER.tokenler = async (pres, k) => {
  const s = pres.addSlide({ masterName: DUZEN.ICERIK });
  baslik(s, k.baslik);
  const etiketW = 2.0, sayiW = 1.5, chipH = 0.6, araX = 0.09, araY = 0.14, pt = 20;
  const x0 = OLCU.M + etiketW + 0.2, xMax = OLCU.W - OLCU.M - sayiW - 0.2;
  const dolgular = [R.kirmiziAcik, R.karsitAcik, R.notrKart];
  const kenarlar = ["F1C6CC", "C9D3DD", R.pasif];
  let y = OLCU.icY + 0.25;
  for (const satir of k.satirlar) {
    const parcalar = satir.parcalar.map((p) => String(p).replace(/^ /, "␣"));
    // çipleri yerleştir (monospace: karakter genişliği ≈ 0.6 em)
    let x = x0, yy = y;
    const yer = [];
    parcalar.forEach((p, i) => {
      const w = Math.max(0.42, [...p].length * pt * 0.6 / 72 + 0.26);
      if (x + w > xMax && x > x0) { x = x0; yy += chipH + araY; }
      yer.push({ p, x, y: yy, w, i });
      x += w + araX;
    });
    const satirH = yy - y + chipH;
    s.addText(satir.etiket, tb({ x: OLCU.M, y, w: etiketW, h: chipH, fontSize: 20, bold: true, color: R.metinIkincil, valign: "middle" }));
    for (const c of yer) {
      s.addText(c.p, {
        shape: "roundRect", rectRadius: 0.06, x: c.x, y: c.y, w: c.w, h: chipH,
        fill: { color: dolgular[c.i % 3] }, line: { color: kenarlar[c.i % 3], width: 0.75 },
        fontFace: F.kod, fontSize: pt, color: R.metin, align: "center", valign: "middle", margin: 0,
      });
    }
    const sayi = satir.sayi ?? parcalar.length;
    s.addText([{ text: String(sayi), options: { bold: true, fontSize: 32, color: R.kirmizi, fontFace: B } }, { text: " token", options: { fontSize: 16, color: R.metinIkincil } }],
      tb({ x: OLCU.W - OLCU.M - sayiW, y: y - 0.05, w: sayiW, h: chipH + 0.1, align: "right", valign: "middle" }));
    y += satirH + 0.42;
    s.addShape("line", { x: OLCU.M, y: y - 0.22, w: OLCU.icW, h: 0, line: { color: R.cizgi, width: 0.75 } });
  }
  if (k.alt) s.addText(k.alt, tb({ x: OLCU.M, y: y + 0.05, w: OLCU.icW, h: 0.7, fontSize: PT.ikincil, bold: true, color: R.kirmiziKoyu }));
  kaynakSatiri(s, k.kaynak);
  notlar(s, k);
  return [s];
};

module.exports = { TURLER };
