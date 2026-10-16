"""Hoca kılavuzu: telefon boyutlu PDF (slayt küçük resmi + kelimesi kelimesine konuşma metni).

Kullanım (proje kökünden, önce destenin PPTX'i ve PDF'i üretilmiş olmalı):
  node sunumlar/_uretici/build.js sunumlar/hafta-01
  soffice --headless --convert-to pdf --outdir sunumlar/hafta-01/cikti sunumlar/hafta-01/cikti/hafta-01.pptx
  python3 sunumlar/_uretici/kilavuz.py sunumlar/hafta-01
Çıktı: <deste>/cikti/<ad>-hoca.pdf   (öğrenciyle paylaşılmaz; cikti/ zaten git'e girmez)

Gerekenler (bir kez): pip install pyyaml pymupdf playwright && playwright install chromium
Girdi: slaytlar.yaml (slayt içeriği ve [dk] notları) + konusma.yaml (söylenecekler) + cikti/slayt-haritasi.txt + cikti/<ad>.pdf
"""
import base64
import html
import json
import re
import sys
import tempfile
from pathlib import Path

import yaml

KOK = Path(__file__).resolve().parents[2]
TEMA = json.loads((KOK / "tasarim" / "tema.json").read_text(encoding="utf-8"))
R = {k: "#" + v for k, v in TEMA["renk"].items()}
FONT = (KOK / "tasarim" / "fontlar").as_uri()

TUR_BASLIK = {"mola": "Mola", "ozet": "Bugün ne öğrendik?", "sozluk": "Bu haftanın sözlüğü", "kaynak": "Kaynaklar"}


def e(s) -> str:
    return html.escape(str(s or ""))


def slayt_basligi(k: dict) -> str:
    for alan in ("baslik", "etiket", "soru"):
        if k.get(alan):
            return str(k[alan])
    return TUR_BASLIK.get(k["tur"], k["id"])


def dakika(not_: str):
    m = re.match(r"\s*\[(\d+)\]", not_ or "")
    return int(m.group(1)) if m else None


def paragraflar(metin: str) -> str:
    """Konuşma metni: her satır bir paragraf; tamamı parantez içindeki satır sahne yönergesidir."""
    cikti = []
    for satir in str(metin or "").strip().splitlines():
        satir = satir.strip()
        if not satir:
            continue
        if satir.startswith("(") and satir.endswith(")"):
            cikti.append(f'<p class="yon">{e(satir[1:-1])}</p>')
        else:
            # satır içindeki (…) yönergelerini de soluk göster
            p = re.sub(r"\(([^()]*)\)", lambda m: f'<span class="yon-ic">({m.group(1)})</span>', e(satir))
            cikti.append(f"<p>{p}</p>")
    return "".join(cikti)


def kucuk_resimler(pdf: Path, genislik=900) -> dict:
    try:
        import pymupdf as fitz
        fitz.TOOLS.mupdf_display_errors(False)
    except ImportError:
        print("⚠ pymupdf yok; küçük resimsiz üretiliyor (pip install pymupdf)")
        return {}
    if not pdf.exists():
        print(f"⚠ {pdf.name} yok; küçük resimsiz üretiliyor (önce soffice ile PDF alın)")
        return {}
    doc = fitz.open(pdf)
    resimler = {}
    for i, sayfa in enumerate(doc, start=1):
        olcek = genislik / sayfa.rect.width
        pix = sayfa.get_pixmap(matrix=fitz.Matrix(olcek, olcek))
        resimler[i] = "data:image/jpeg;base64," + base64.b64encode(pix.tobytes("jpeg", jpg_quality=82)).decode()
    return resimler


def html_uret(deste_dizin: Path) -> tuple[str, str]:
    kaynak = yaml.safe_load((deste_dizin / "slaytlar.yaml").read_text(encoding="utf-8"))
    konusma = yaml.safe_load((deste_dizin / "konusma.yaml").read_text(encoding="utf-8")) or {}
    d = kaynak["deste"]
    cikti = deste_dizin / "cikti"

    # id → slayt numaraları
    numaralar: dict[str, list[int]] = {}
    for satir in (cikti / "slayt-haritasi.txt").read_text(encoding="utf-8").splitlines()[1:]:
        kod, id_, _ = satir.split("\t")
        numaralar.setdefault(id_, []).append(int(kod.split("·")[1]))
    toplam = max(n for ns in numaralar.values() for n in ns)
    resimler = kucuk_resimler(cikti / f"{d['ad']}.pdf")

    def yer_tut(metin: str) -> str:
        return re.sub(r"\{([\w-]+)\}", lambda m: str(numaralar.get(m.group(1), ["?"])[0]), metin)

    ders = konusma.get("_ders", {})
    bolum = "Açılış"
    son_dk = 0
    icerik, sayfalar = [], []
    for k in kaynak["slaytlar"]:
        if k.get("bolum"):
            bolum = k["bolum"] if k["tur"] != "bolum" else k["bolum"]
        dk = dakika(k.get("not"))
        if dk is not None:
            son_dk = dk
        nolar = numaralar.get(k["id"], [])
        no = nolar[0] if nolar else "?"
        km = konusma.get(k["id"], {})
        baslik = slayt_basligi(k)
        icerik.append(f'<li><a href="#s-{k["id"]}"><span class="dk">{son_dk}′</span><span class="no">{no}</span>{e(baslik)}</a></li>')

        parca = [f'<section class="slayt" id="s-{k["id"]}">',
                 f'<div class="ust"><span>Slayt {no}{"–" + str(nolar[-1]) if len(nolar) > 1 else ""} / {toplam}</span>'
                 f'<span>{e(bolum)}</span><span class="dk-et">{son_dk}. dk</span></div>',
                 f"<h2>{e(baslik)}</h2>"]
        if nolar and resimler.get(nolar[0]):
            parca.append(f'<img class="kucuk" src="{resimler[nolar[0]]}" alt="">')
            if len(nolar) > 1 and resimler.get(nolar[-1]):
                parca.append(f'<p class="ek-not">Cevap slaytı ({nolar[-1]}):</p><img class="kucuk ikinci" src="{resimler[nolar[-1]]}" alt="">')
        if km.get("soyle"):
            parca.append(f'<div class="etiket">Söyleyin</div><div class="soyle">{paragraflar(km["soyle"])}</div>')
        if km.get("sor"):
            parca.append(f'<div class="etiket">Sorun</div><div class="sor">{paragraflar(km["sor"])}</div>')
        if km.get("beklenen"):
            parca.append('<div class="etiket">Beklenen cevaplar</div><ul class="beklenen">' +
                         "".join(f"<li>{e(b)}</li>" for b in km["beklenen"]) + "</ul>")
        not_ = re.sub(r"^\s*\[\d+\]\s*", "", str(k.get("not") or "")).strip()
        if not_:
            parca.append(f'<div class="etiket gri">Hoca notu</div><div class="not">{paragraflar(not_)}</div>')
        if km.get("gecis"):
            parca.append(f'<div class="gecis"><span>Geçiş →</span>{paragraflar(km["gecis"])}</div>')
        parca.append("</section>")
        sayfalar.append("".join(parca))

    hazirlik = "".join(f"<li>{e(yer_tut(h))}</li>" for h in ders.get("hazirlik", []))
    gizli = "".join(f"<li>{e(yer_tut(g))}</li>" for g in ders.get("gizli", []))
    baslik = d["baslik"]

    css = f"""
@font-face {{ font-family: Inter; src: url({FONT}/Inter-Regular.ttf); font-weight: 400; }}
@font-face {{ font-family: Inter; src: url({FONT}/Inter-Bold.ttf); font-weight: 700; }}
@font-face {{ font-family: Inter; src: url({FONT}/Inter-Italic.ttf); font-style: italic; }}
@font-face {{ font-family: InterDisplay; src: url({FONT}/InterDisplay-Bold.ttf); font-weight: 700; }}
@page {{ size: 105mm 190mm; margin: 7mm 6.5mm 9mm; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: Inter, sans-serif; font-size: 15.5px; line-height: 1.5; color: {R['metin']}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
h1 {{ font-family: InterDisplay, Inter; font-size: 27px; line-height: 1.15; margin: 6px 0 4px; }}
h2 {{ font-family: InterDisplay, Inter; font-size: 21px; line-height: 1.2; margin: 8px 0 10px; }}
p {{ margin: 0 0 9px; }}
.kapak .kirmizi-et {{ display: inline-block; background: {R['kirmizi']}; color: #fff; font-weight: 700; font-size: 12px; letter-spacing: .08em; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }}
.kapak .alt {{ color: {R['metinIkincil']}; margin-bottom: 14px; }}
.kutu {{ border: 1px solid {R['cizgi']}; border-radius: 8px; padding: 10px 12px; margin: 12px 0; break-inside: avoid; }}
.kutu h3 {{ margin: 0 0 6px; font-size: 15px; }}
.kutu ul {{ margin: 0; padding-left: 18px; }} .kutu li {{ margin-bottom: 5px; font-size: 14px; }}
.kutu.uyari {{ border-color: {R['kirmizi']}; }} .kutu.uyari h3 {{ color: {R['kirmizi']}; }}
.icindekiler {{ break-before: page; }}
.icindekiler ol {{ list-style: none; padding: 0; margin: 0; }}
.icindekiler li a {{ display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid {R['cizgi']}; color: {R['metin']}; text-decoration: none; font-size: 13.5px; line-height: 1.3; }}
.icindekiler .dk {{ width: 34px; flex: none; color: {R['metinIkincil']}; text-align: right; }}
.icindekiler .no {{ width: 22px; flex: none; color: {R['kirmizi']}; font-weight: 700; text-align: right; }}
.slayt {{ break-before: page; }}
.ust {{ display: flex; justify-content: space-between; gap: 6px; font-size: 11.5px; color: {R['metinIkincil']}; border-bottom: 2px solid {R['kirmizi']}; padding-bottom: 4px; }}
.dk-et {{ color: {R['kirmizi']}; font-weight: 700; }}
.kucuk {{ width: 100%; border-radius: 5px; border: 1px solid {R['cizgi']}; display: block; margin-bottom: 10px; }}
.kucuk.ikinci {{ width: 60%; }}
.ek-not {{ font-size: 12px; color: {R['metinIkincil']}; margin: -4px 0 4px; }}
.etiket {{ font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: {R['kirmizi']}; margin: 12px 0 5px; }}
.etiket.gri {{ color: {R['metinIkincil']}; }}
.soyle {{ font-size: 16.5px; line-height: 1.55; }}
.yon {{ font-style: italic; color: {R['metinIkincil']}; font-size: 14px; }}
.yon-ic {{ font-style: italic; color: {R['metinIkincil']}; }}
.sor {{ background: {R['notrKart']}; border-radius: 6px; padding: 8px 10px 1px; font-weight: 700; }}
.beklenen {{ margin: 0; padding-left: 18px; font-size: 14.5px; }} .beklenen li {{ margin-bottom: 5px; }}
.not {{ font-size: 13.5px; color: {R['metinIkincil']}; }}
.gecis {{ margin-top: 14px; border-left: 4px solid {R['kirmizi']}; padding: 6px 0 1px 10px; background: {R['zemin']}; break-inside: avoid; }}
.gecis span {{ display: block; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: {R['kirmizi']}; margin-bottom: 3px; }}
"""
    sayfa = f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>{e(baslik)} · Hoca kılavuzu</title><style>{css}</style></head><body>
<section class="kapak">
<span class="kirmizi-et">Yalnızca hoca için</span>
<h1>{e(baslik)}</h1>
<p class="alt">Hoca kılavuzu · {toplam} slayt · yaklaşık {son_dk + 3} dakika</p>
<div class="kutu"><h3>Nasıl kullanılır?</h3><ul>
<li><b>Söyleyin:</b> kelimesi kelimesine okunabilecek metin. İtalik satırlar sahne yönergesidir; okunmaz.</li>
<li><b>Sorun / Beklenen cevaplar:</b> sınıfa sorulacak soru ve gelebilecek cevaplar.</li>
<li><b>Geçiş:</b> sonraki slayta bağlayan cümle.</li>
<li>Sağ üstteki dakika, dersin başından itibaren yaklaşık zamandır. İçindekiler'den slayta dokunarak gidebilirsiniz.</li></ul></div>
<div class="kutu"><h3>Ders öncesi kontrol</h3><ul>{hazirlik}</ul></div>
<div class="kutu uyari"><h3>Öğrenciye erken söylemeyin</h3><ul>{gizli}</ul></div>
</section>
<section class="icindekiler"><h2>İçindekiler</h2><ol>{''.join(icerik)}</ol></section>
{''.join(sayfalar)}
</body></html>"""
    return sayfa, d["ad"]


def main():
    if len(sys.argv) < 2:
        sys.exit("Kullanım: python3 sunumlar/_uretici/kilavuz.py <deste-dizini>")
    deste = Path(sys.argv[1]).resolve()
    sayfa, ad = html_uret(deste)
    gecici = Path(tempfile.gettempdir()) / f"{ad}-hoca.html"
    gecici.write_text(sayfa, encoding="utf-8")
    hedef = deste / "cikti" / f"{ad}-hoca.pdf"
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        t = p.chromium.launch()
        s = t.new_page()
        s.goto(gecici.as_uri())
        s.evaluate("document.fonts.ready")
        s.pdf(path=str(hedef), prefer_css_page_size=True, print_background=True, outline=True, tagged=True,
              display_header_footer=True, header_template="<span></span>",
              footer_template=f'<div style="font-family:sans-serif;font-size:7px;color:#888;width:100%;text-align:center;">'
                              f'H{ad.split("-")[-1].lstrip("0")} hoca kılavuzu · <span class="pageNumber"></span>/<span class="totalPages"></span></div>')
        t.close()
    print(f"✔ {hedef.relative_to(Path.cwd()) if hedef.is_relative_to(Path.cwd()) else hedef}")


if __name__ == "__main__":
    main()
