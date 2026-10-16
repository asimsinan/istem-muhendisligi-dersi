// pptxgenjs'in yazamadığı özellikleri .pptx içindeki XML'e ekler:
//  1) Tema renkleri (PowerPoint'te yeni şekil eklerken ders paleti görünsün)
//  2) Morph (Dönüşüm) geçişi — kademeli slaytlar
//  3) Videonun slayt açılınca kendiliğinden başlaması
const fs = require("fs");
const JSZip = require("jszip");
const { R, F } = require("./tema");

function temaRenkleri(xml) {
  const sema = `<a:clrScheme name="Istem Muhendisligi">` +
    `<a:dk1><a:srgbClr val="${R.metin}"/></a:dk1><a:lt1><a:srgbClr val="${R.kart}"/></a:lt1>` +
    `<a:dk2><a:srgbClr val="${R.karsit}"/></a:dk2><a:lt2><a:srgbClr val="${R.zemin}"/></a:lt2>` +
    `<a:accent1><a:srgbClr val="${R.kirmizi}"/></a:accent1><a:accent2><a:srgbClr val="${R.karsit}"/></a:accent2>` +
    `<a:accent3><a:srgbClr val="${R.kirmiziKoyu}"/></a:accent3><a:accent4><a:srgbClr val="${R.pasif}"/></a:accent4>` +
    `<a:accent5><a:srgbClr val="${R.metinIkincil}"/></a:accent5><a:accent6><a:srgbClr val="${R.notrKart}"/></a:accent6>` +
    `<a:hlink><a:srgbClr val="${R.kirmizi}"/></a:hlink><a:folHlink><a:srgbClr val="${R.kirmiziKoyu}"/></a:folHlink>` +
    `</a:clrScheme>`;
  return xml
    .replace(/<a:clrScheme [\s\S]*?<\/a:clrScheme>/, sema)
    .replace(/<a:theme ([^>]*)name="[^"]*"/, `<a:theme $1name="Istem Muhendisligi"`);
}

const MORPH =
  `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">` +
  `<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">` +
  `<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="1000"><p159:morph option="byObject"/></p:transition>` +
  `</mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`;

function morphEkle(xml) {
  if (xml.includes("p159:morph")) return xml;
  return xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + MORPH);
}

function videoKimligi(xml) {
  // pptxgenjs: <p:cNvPr id="N" name="video-..."><a:hlinkClick .../></p:cNvPr> ... <a:videoFile
  const m = xml.match(/<p:cNvPr id="(\d+)" name="video-[^"]*">/);
  return m ? m[1] : null;
}

// "Slayt açılınca otomatik başlat" zamanlaması — PowerPoint'in kendi yazdığı yapı:
// tmRoot > mainSeq (id 2) > onBegin(tn=2) tetikli par > afterEffect + mediacall playFrom.
// İlk sürümdeki hata: mainSeq düğümü yoktu, tetik kendine işaret ediyordu → hiç başlamıyordu.
// duraklatma: true ise videoya tıklayınca dur/devam et (PowerPoint'in "interactiveSeq" yapısı).
function otomatikOynat(xml, { sureMs = 60000, duraklatma = true } = {}) {
  const spid = videoKimligi(xml);
  if (!spid || xml.includes("<p:timing>")) return xml;
  const hedef = `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
  let id = 1;
  const tmRoot = id++, mainSeq = id++, p1 = id++, p2 = id++, efekt = id++, oynat = id++;
  let xmlZaman =
    `<p:timing><p:tnLst><p:par><p:cTn id="${tmRoot}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${mainSeq}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
    `<p:par><p:cTn id="${p1}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="${mainSeq}"/></p:cond></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="${p2}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="${efekt}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
    `<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="${oynat}" dur="${Math.round(sureMs)}" fill="hold"/>${hedef}</p:cBhvr></p:cmd>` +
    `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn>` +
    `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`;
  if (duraklatma) {
    const iSeq = id++, i1 = id++, i2 = id++, iEf = id++, iCmd = id++;
    xmlZaman +=
      `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${iSeq}" restart="whenNotActive" fill="hold" evtFilter="cancelBubble" nodeType="interactiveSeq">` +
      `<p:stCondLst><p:cond evt="onClick" delay="0">${hedef}</p:cond></p:stCondLst>` +
      `<p:endSync evt="end" delay="0"><p:rtn val="all"/></p:endSync><p:childTnLst>` +
      `<p:par><p:cTn id="${i1}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="${i2}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="${iEf}" presetID="2" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      `<p:cmd type="call" cmd="togglePause"><p:cBhvr><p:cTn id="${iCmd}" dur="1" fill="hold"/>${hedef}</p:cBhvr></p:cmd>` +
      `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
      `</p:childTnLst></p:cTn><p:nextCondLst><p:cond evt="onClick" delay="0">${hedef}</p:cond></p:nextCondLst></p:seq>`;
  }
  const medya = id++;
  xmlZaman +=
    `<p:video><p:cMediaNode vol="80000"><p:cTn id="${medya}" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>${hedef}</p:cMediaNode></p:video>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
  // p:timing, p:transition'dan SONRA ve p:extLst'ten ÖNCE gelir
  if (xml.includes("</mc:AlternateContent>")) return xml.replace(/(<\/mc:AlternateContent>)(?![\s\S]*<\/mc:AlternateContent>)/, `$1${xmlZaman}`);
  return xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + xmlZaman);
}

// pptxgenjs bazı slaytlarda aynı şekil kimliğini iki kez yazıyor (ör. video ile önceki şekil).
// Video kimliği korunur, çakışan diğer şekillere yeni kimlik verilir.
function kimlikleriTekillestir(xml) {
  const re = /<p:cNvPr id="(\d+)" name="([^"]*)"/g;
  const tum = [...xml.matchAll(re)];
  const enBuyuk = Math.max(0, ...tum.map((m) => +m[1]));
  let sonraki = enBuyuk + 1;
  const sayim = {};
  tum.forEach((m) => { sayim[m[1]] = (sayim[m[1]] || 0) + 1; });
  const korunan = new Set(tum.filter((m) => m[2].startsWith("video-")).map((m) => m[1]));
  const goruldu = new Set();
  return xml.replace(re, (tam, id, ad) => {
    const cakisiyor = sayim[id] > 1;
    if (!cakisiyor) return tam;
    const buVideo = ad.startsWith("video-");
    if (buVideo || (!korunan.has(id) && !goruldu.has(id))) { goruldu.add(id); return tam; }
    return `<p:cNvPr id="${sonraki++}" name="${ad}"`;
  });
}

async function sonIsle(dosya, isler) {
  const zip = await JSZip.loadAsync(fs.readFileSync(dosya));
  const temaYol = Object.keys(zip.files).find((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f));
  for (const f of Object.keys(zip.files).filter((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f))) {
    zip.file(f, temaRenkleri(await zip.file(f).async("string")));
  }
  for (const f of Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))) {
    zip.file(f, kimlikleriTekillestir(await zip.file(f).async("string")));
  }
  for (const is of isler) {
    const yol = `ppt/slides/slide${is.slaytNo}.xml`;
    let xml = await zip.file(yol).async("string");
    if (is.tur === "morph") xml = morphEkle(xml);
    if (is.tur === "video" && is.oynat === "otomatik") xml = otomatikOynat(xml, is);
    zip.file(yol, xml);
  }
  const cikti = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(dosya, cikti);
  return temaYol;
}

module.exports = { sonIsle };
