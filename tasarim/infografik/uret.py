"""README infografiği (TR + EN) — HTML olarak kurulur, Chromium ile PNG'ye çevrilir.

Çalıştırma (proje kökünden):
  pip install segno playwright && playwright install chromium   # bir kez
  python3 tasarim/infografik/uret.py          # infografik.png ve infografik.en.png üretir (2400 px genişlik)

İçerik README.md / README.en.md ile aynı olmalıdır; README değişince VERI güncellenir.
Renkler ve yazı tipleri tasarim/tema.json'dan gelir.
"""
import json
import tempfile
from pathlib import Path

import segno
from playwright.sync_api import sync_playwright

KOK = Path(__file__).resolve().parents[2]
TEMA = json.loads((KOK / "tasarim" / "tema.json").read_text(encoding="utf-8"))
R = {k: "#" + v for k, v in TEMA["renk"].items()}
FONT_DIZIN = (KOK / "tasarim" / "fontlar").as_uri()
SITE = "istem-muhendisligi-dersi.vercel.app"
GENISLIK = 1200  # CSS piksel; PNG 2x ölçekle 2400 px olur

# Katman → rozet stili (M1.3 videosuyla aynı mantık: İstem dolu kırmızı, Bağlam kırmızı çerçeve,
# Harness dolu koyu, Döngü koyu çerçeve; sınav ve proje nötr)
KATMAN_STIL = {
    0: ("dolu", R["kirmizi"]),
    1: ("cerceve", R["kirmizi"]),
    2: ("dolu", R["karsit"]),
    3: ("cerceve", R["karsit"]),
    None: ("notr", R["pasif"]),
}

VERI = {
    "tr": {
        "dosya": "infografik.png",
        "ust": "SDÜ Bilgisayar Mühendisliği · 4. sınıf seçmeli ders",
        "baslik": "İstem Mühendisliği",
        "alt": "İstemden bağlam ve döngü mühendisliğine",
        "ozet": "Yapay zekâya iyi soru sormanın ötesinde: modele hangi bilginin verileceğini, hangi araçları kullanacağını ve işin ne zaman biteceğini tasarlamak.",
        "katman_baslik": "Dört katman",
        "katman_alt": "Her yeni katman öncekini içine alır; istem hep merkezde kalır.",
        "katmanlar": [
            ("İstem", "prompt", "Modele nasıl sormalı?", "Hafta 1–5"),
            ("Bağlam", "context", "Hangi bilgiyi, hangi sırayla vermeli?", "Hafta 6, 8, 9"),
            ("Harness", "", "Hangi araçlar, hangi izinlerle açık?", "Hafta 10, 12"),
            ("Döngü", "loop", "Ne zaman bitti? Kim kontrol ediyor?", "Hafta 11"),
        ],
        "plan_baslik": "14 haftalık plan",
        "hafta_kisa": "H",
        "haftalar": [
            ("1", "Üretken yapay zekâya giriş", "YZ ailesi · model aileleri · dört katman haritası", 0),
            ("2", "Model kabaca nasıl çalışır?", "Token · gömme · dikkat · sıcaklık", 0),
            ("3", "İstem yazma, OpenRouter ve düzenli çıktı", "Sistem mesajı · örnekle öğretme · JSON", 0),
            ("4", "Daha iyi istemler, ilk güvenlik uyarısı", "Net talimat · persona · istem enjeksiyonu", 0),
            ("5", "Bilgisayarınızda model çalıştırmak", "Ollama · LM Studio · gizlilik ve maliyet", 0),
            ("6", "Bağlam mühendisliği", "Bağlamın anatomisi · bağlam hataları · stratejiler", 1),
            ("7", "Ara sınav (vize)", "Hafta 1–6 · 60 dakika", None),
            ("8", "RAG: Belgelerinizden cevap üretmek", "Parçalama · gömme · arama · kaynak gösterme", 1),
            ("9", "Modern RAG iyileştirmeleri", "Hibrit arama · yeniden sıralama · sorgu dönüşümü", 1),
            ("10", "Ajanlar: Araç kullanan yapay zekâ", "Araç çağırma · araç tanımları da bağlamdır", 2),
            ("11", "Döngü ve harness", "Hedef · adım limiti · doğrulayıcı · izin ve log", 3),
            ("12", "Güvenlik, etik ve değerlendirme", "İstem enjeksiyonu · aşırı yetki · test seti", 2),
            ("13–14", "Proje sunumları ve kapanış", "15–20 dakika sunum · canlı demo", None),
        ],
        "lejant": ["İstem", "Bağlam", "Harness", "Döngü", "Sınav / proje"],
        "deg_baslik": "Değerlendirme",
        "deg": [("%30", "Ödev ve uygulama", "6–8 kısa ödev"), ("%30", "Vize", "Hafta 1–6"), ("%40", "Final projesi", "2–3 kişilik grup")],
        "arac_baslik": "Derste kullanacağımız araçlar",
        "araclar": [("OpenRouter", "tek anahtar, birçok model"), ("Ollama · LM Studio", "yerel modeller"),
                    ("Python · Pydantic", "JSON Schema ile düzenli çıktı"), ("Chroma", "vektör veritabanı")],
        "proje_baslik": "Final projesi",
        "proje": ["Belgelerden cevap (RAG) ya da araç kullanan ajan", "En az 5 kontrollü doğrulayıcı",
                  "İstem dosyası ve kurulum anlatan README", "Yarım sayfa etik değerlendirme", "Canlı demo"],
        "site_baslik": "Ders sitesi",
        "site_alt": "Derste QR ile açılan interaktif sayfalar",
        "surum": "Sürüm 3.6 · Ekim 2026",
    },
    "en": {
        "dosya": "infografik.en.png",
        "ust": "SDÜ Computer Engineering · 4th-year elective",
        "baslik": "Prompt Engineering",
        "alt": "From prompt to context and loop engineering",
        "ozet": "Beyond asking AI good questions: designing what information the model gets, which tools it may use, and when the work is done.",
        "katman_baslik": "Four layers",
        "katman_alt": "Each new layer wraps the previous one; the prompt always stays at the centre.",
        "katmanlar": [
            ("Prompt", "", "How should we ask the model?", "Weeks 1–5"),
            ("Context", "", "Which information, in which order?", "Weeks 6, 8, 9"),
            ("Harness", "", "Which tools are open, with which permissions?", "Weeks 10, 12"),
            ("Loop", "", "When is it done? Who checks?", "Week 11"),
        ],
        "plan_baslik": "14-week plan",
        "hafta_kisa": "W",
        "haftalar": [
            ("1", "Introduction to generative AI", "AI family · model families · four-layer map", 0),
            ("2", "How does a model roughly work?", "Tokens · embeddings · attention · temperature", 0),
            ("3", "Prompt writing, OpenRouter, structured output", "System message · few-shot · JSON", 0),
            ("4", "Better prompts, first security warning", "Clear instructions · persona · prompt injection", 0),
            ("5", "Running a model on your computer", "Ollama · LM Studio · privacy and cost", 0),
            ("6", "Context engineering", "Anatomy of context · context failures · strategies", 1),
            ("7", "Midterm exam", "Weeks 1–6 · 60 minutes", None),
            ("8", "RAG: answers from your documents", "Chunking · embedding · retrieval · citations", 1),
            ("9", "Modern RAG improvements", "Hybrid search · reranking · query transformation", 1),
            ("10", "Agents: tool-using AI", "Tool calling · tool definitions are context too", 2),
            ("11", "Loop and harness", "Goal · step limit · verifier · permissions and logs", 3),
            ("12", "Security, ethics, and evaluation", "Prompt injection · excessive agency · test set", 2),
            ("13–14", "Project presentations and wrap-up", "15–20 minute talks · live demo", None),
        ],
        "lejant": ["Prompt", "Context", "Harness", "Loop", "Exam / project"],
        "deg_baslik": "Assessment",
        "deg": [("30%", "Homework and practice", "6–8 short assignments"), ("30%", "Midterm", "Weeks 1–6"), ("40%", "Final project", "groups of 2–3")],
        "arac_baslik": "Tools we will use",
        "araclar": [("OpenRouter", "one key, many models"), ("Ollama · LM Studio", "local models"),
                    ("Python · Pydantic", "structured output with JSON Schema"), ("Chroma", "vector database")],
        "proje_baslik": "Final project",
        "proje": ["Document Q&A (RAG) or a tool-using agent", "A verifier with at least 5 checks",
                  "Prompt file and a README with setup", "Half-page ethics note", "Live demo"],
        "site_baslik": "Course site",
        "site_alt": "Interactive pages opened by QR code in class",
        "surum": "Version 3.6 · October 2026",
    },
}


def qr_svg(url: str) -> str:
    q = segno.make(url, error="m")
    uri = q.svg_data_uri(scale=10, dark=R["metin"], light="#ffffff", border=2)
    return f'<img src="{uri}" alt="" width="112" height="112">'



def rozet(metin: str, katman, buyuk=False) -> str:
    tur, renk = KATMAN_STIL[katman]
    sinif = "rozet buyuk" if buyuk else "rozet"
    if tur == "dolu":
        stil = f"background:{renk};color:#fff;border-color:{renk}"
    elif tur == "cerceve":
        stil = f"background:{R['kart']};color:{renk};border-color:{renk}"
    else:
        stil = f"background:{R['notrKart']};color:{R['metinIkincil']};border-color:{R['pasif']}"
    return f'<span class="{sinif}" style="{stil}">{metin}</span>'


def katman_diyagrami(adlar) -> str:
    """Kapaktaki gibi iç içe dört kutu (koyu zemin üzerinde)."""
    olc = [(150, 64), (226, 128), (302, 192), (378, 256)]
    W, H = 400, 272
    parcalar = []
    for i in range(3, -1, -1):
        w, h = olc[i]
        x, y = (W - w) / 2, (H - h) / 2 + (8 if i < 3 else 0)
        if i == 0:
            parcalar.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{R["kirmizi"]}"/>')
            parcalar.append(f'<text x="{W/2}" y="{y + h/2 + 7}" text-anchor="middle" class="d0">{adlar[0].upper()}</text>')
        else:
            kenar = R["kirmiziParlak"] if i == 1 else R["koyuIkincil"]
            dolgu = R["koyuKart"] if i == 1 else R["koyuZemin"]
            parcalar.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{dolgu}" stroke="{kenar}" stroke-width="2"/>')
            parcalar.append(f'<text x="{x + 14}" y="{y + 24}" class="d{"1" if i == 1 else "n"}">{adlar[i].upper()}</text>')
    return f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" aria-hidden="true">{"".join(parcalar)}</svg>'


def html(d) -> str:
    katmanlar = "".join(
        f'''<div class="katman" style="--v:{KATMAN_STIL[i][1]}">
              <div class="katman-bas">{rozet(str(i + 1), i)}<div><b>{ad}</b>{f' <i>({ek})</i>' if ek else ''}</div></div>
              <p>{soru}</p><span class="hafta-et">{hafta}</span></div>'''
        for i, (ad, ek, soru, hafta) in enumerate(d["katmanlar"]))

    def satir(h):
        no, bas, alt, k = h
        return f'''<div class="hafta">{rozet(no, k, buyuk=len(no) > 2)}
                   <div><b>{bas}</b><span>{alt}</span></div></div>'''
    yari = 7
    sol = "".join(satir(h) for h in d["haftalar"][:yari])
    sag = "".join(satir(h) for h in d["haftalar"][yari:])
    lejant = "".join(f'<span class="lej">{rozet("", k)}{ad}</span>' for k, ad in zip([0, 1, 2, 3, None], d["lejant"]))

    deg_genislik = [30, 30, 40]
    deg_renk = [R["karsit"], R["metinIkincil"], R["kirmizi"]]
    cubuk = "".join(f'<span style="flex:{g};background:{c}"></span>' for g, c in zip(deg_genislik, deg_renk))
    deg = "".join(
        f'<div class="deg"><b style="color:{c}">{y}</b><div><strong>{a}</strong><span>{n}</span></div></div>'
        for (y, a, n), c in zip(d["deg"], deg_renk))
    araclar = "".join(f'<li><b>{a}</b><span>{n}</span></li>' for a, n in d["araclar"])
    proje = "".join(f'<li>{p}</li>' for p in d["proje"])

    return f"""<!doctype html><html lang="{'tr' if d['dosya'] == 'infografik.png' else 'en'}"><head><meta charset="utf-8">
<style>
@font-face {{ font-family: Inter; src: url({FONT_DIZIN}/Inter-Regular.ttf); font-weight: 400; }}
@font-face {{ font-family: Inter; src: url({FONT_DIZIN}/Inter-Bold.ttf); font-weight: 700; }}
@font-face {{ font-family: Inter; src: url({FONT_DIZIN}/Inter-Italic.ttf); font-weight: 400; font-style: italic; }}
@font-face {{ font-family: InterDisplay; src: url({FONT_DIZIN}/InterDisplay-Bold.ttf); font-weight: 700; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: {GENISLIK}px; background: {R['zemin']}; color: {R['metin']}; font-family: Inter, sans-serif; font-size: 17px; line-height: 1.4; }}
.bas {{ background: {R['koyuZemin']}; color: {R['koyuMetin']}; padding: 52px 56px 48px 56px; display: flex; align-items: center; gap: 32px; position: relative; }}
.bas::before {{ content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: {R['kirmizi']}; }}
.bas .metin {{ flex: 1; }}
.ust {{ color: {R['kirmiziParlak']}; font-weight: 700; font-size: 15px; letter-spacing: .12em; text-transform: uppercase; }}
h1 {{ font-family: InterDisplay, Inter; font-size: 66px; line-height: 1.02; margin: 14px 0 10px; letter-spacing: -.01em; }}
.alt {{ font-size: 24px; color: {R['koyuMetin']}; margin-bottom: 18px; }}
.ozet {{ font-size: 17px; color: {R['koyuIkincil']}; max-width: 620px; }}
.d0 {{ font: 700 17px Inter; fill: #fff; letter-spacing: .06em; }}
.d1 {{ font: 700 13px Inter; fill: {R['kirmiziParlak']}; letter-spacing: .08em; }}
.dn {{ font: 700 13px Inter; fill: {R['koyuIkincil']}; letter-spacing: .08em; }}
main {{ padding: 40px 56px 0; }}
h2 {{ font-family: InterDisplay, Inter; font-size: 28px; margin-bottom: 4px; }}
.cizgi + .not {{ color: {R['metinIkincil']}; font-size: 16px; margin-bottom: 18px; }}
.cizgi {{ width: 48px; height: 4px; background: {R['kirmizi']}; margin: 8px 0 10px; }}
.katmanlar {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }}
.katman {{ background: {R['kart']}; border: 1px solid {R['cizgi']}; border-top: 4px solid var(--v); border-radius: 12px; padding: 18px 18px 16px; display: flex; flex-direction: column; gap: 10px; }}
.katman-bas {{ display: flex; align-items: center; gap: 10px; font-size: 20px; }}
.katman-bas i {{ font-size: 15px; color: {R['metinIkincil']}; font-weight: 400; }}
.katman p {{ font-size: 17px; flex: 1; }}
.hafta-et {{ font-size: 14px; font-weight: 700; color: {R['metinIkincil']}; }}
.rozet {{ display: inline-grid; place-items: center; line-height: 1; min-width: 34px; height: 34px; padding: 0 6px; border-radius: 17px; border: 2px solid; font-weight: 700; font-size: 15px; flex: none; }}
.rozet.buyuk {{ font-size: 13px; padding: 0 8px; }}
.blok {{ margin-top: 40px; }}
.plan {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; background: {R['kart']}; border: 1px solid {R['cizgi']}; border-radius: 12px; padding: 8px 24px; }}
.hafta {{ display: flex; gap: 14px; align-items: center; padding: 13px 0; border-bottom: 1px solid {R['cizgi']}; min-height: 74px; }}
.plan > div > .hafta:last-child {{ border-bottom: 0; }}
.hafta div b {{ display: block; font-size: 17.5px; }}
.hafta div span {{ display: block; font-size: 15px; color: {R['metinIkincil']}; }}
.lejant {{ display: flex; gap: 22px; margin-top: 12px; font-size: 14.5px; color: {R['metinIkincil']}; }}
.lej {{ display: inline-flex; align-items: center; gap: 8px; }}
.lej .rozet {{ min-width: 16px; height: 16px; padding: 0; border-radius: 8px; }}
.alt3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; }}
.kart {{ background: {R['kart']}; border: 1px solid {R['cizgi']}; border-radius: 12px; padding: 22px; }}
.kart h3 {{ font-size: 20px; margin-bottom: 14px; }}
.cubuk {{ display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 3px; margin-bottom: 16px; }}
.deg {{ display: flex; gap: 12px; align-items: baseline; padding: 6px 0; }}
.deg i {{ width: 10px; height: 10px; border-radius: 5px; flex: none; align-self: center; }}
.deg > b {{ font-family: InterDisplay, Inter; font-size: 26px; min-width: 66px; }}
.deg strong {{ display: block; font-size: 16.5px; }}
.deg span, .kart li span {{ display: block; font-size: 14.5px; color: {R['metinIkincil']}; }}
.kart ul {{ list-style: none; display: grid; gap: 11px; }}
.kart li b {{ font-size: 16.5px; }}
.proje li {{ position: relative; padding-left: 22px; font-size: 16.5px; }}
.proje li::before {{ content: ""; position: absolute; left: 0; top: 10px; width: 11px; height: 3px; background: {R['kirmizi']}; }}
footer {{ margin: 40px 56px 0; padding: 24px 0 44px; border-top: 1px solid {R['cizgi']}; display: flex; align-items: center; gap: 22px; }}
footer .qr {{ background: {R['kart']}; padding: 4px; border-radius: 10px; border: 1px solid {R['cizgi']}; line-height: 0; }}
footer .qr img {{ width: 112px; height: 112px; display: block; image-rendering: pixelated; }}
footer b {{ display: block; font-size: 18px; }}
footer .url, footer .ack {{ display: block; }}
footer .url {{ color: {R['kirmizi']}; font-weight: 700; font-size: 18px; }}
footer .ack {{ color: {R['metinIkincil']}; font-size: 15px; }}
footer .surum {{ margin-left: auto; text-align: right; color: {R['metinIkincil']}; font-size: 15px; }}
</style></head><body>
<header class="bas"><div class="metin"><p class="ust">{d['ust']}</p><h1>{d['baslik']}</h1>
<p class="alt">{d['alt']}</p><p class="ozet">{d['ozet']}</p></div>{katman_diyagrami([k[0] for k in d['katmanlar']])}</header>
<main>
<section><h2>{d['katman_baslik']}</h2><div class="cizgi"></div><p class="not">{d['katman_alt']}</p><div class="katmanlar">{katmanlar}</div></section>
<section class="blok"><h2>{d['plan_baslik']}</h2><div class="cizgi"></div>
<div class="plan"><div>{sol}</div><div>{sag}</div></div><div class="lejant">{lejant}</div></section>
<section class="alt3">
<div class="kart"><h3>{d['deg_baslik']}</h3><div class="cubuk">{cubuk}</div>{deg}</div>
<div class="kart"><h3>{d['arac_baslik']}</h3><ul>{araclar}</ul></div>
<div class="kart"><h3>{d['proje_baslik']}</h3><ul class="proje">{proje}</ul></div>
</section></main>
<footer><div class="qr">{qr_svg('https://' + SITE)}</div>
<div><b>{d['site_baslik']}</b><span class="url">{SITE}</span><span class="ack">{d['site_alt']}</span></div>
<div class="surum">{d['surum']}</div></footer>
</body></html>"""


def main():
    cikti = KOK
    with sync_playwright() as p:
        tarayici = p.chromium.launch()
        sayfa = tarayici.new_page(viewport={"width": GENISLIK, "height": 800}, device_scale_factor=2)
        for dil, d in VERI.items():
            h = Path(tempfile.gettempdir()) / f"infografik.{dil}.html"  # geçici; repoya girmez
            h.write_text(html(d), encoding="utf-8")
            sayfa.goto(h.as_uri())
            sayfa.evaluate("document.fonts.ready")
            sayfa.screenshot(path=str(cikti / d["dosya"]), full_page=True)
            print("✔", d["dosya"])
        tarayici.close()


if __name__ == "__main__":
    main()
