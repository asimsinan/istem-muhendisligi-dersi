"""Hoca demo not defterlerini üretir: hafta-02/demo.ipynb, hafta-03/demo.ipynb, hafta-04/demo.ipynb.

Sunumdaki "canlı gösterin" notları için hazır, projeksiyonda çalıştırılacak hücreler. Her bölüm başlığı
slayt numarasını taşır (H3·18 gibi). Öğrenci lab'ı değildir; hoca kendi anahtarıyla çalıştırır.
H4 metinleri interaktif/src/veri/h04-arena-veri.json'dan gelir (lab ve Arena ile aynı).

Çalıştırma (proje kökünden):  python3 sunumlar/_uretici/demo_uret.py
"""
import json
import pprint
from pathlib import Path

import nbformat as nbf

KOK = Path(__file__).resolve().parents[2]
md, kod = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell
COLAB = "https://colab.research.google.com/github/asimsinan/istem-muhendisligi-dersi/blob/main/{}/demo.ipynb"

KURULUM_MD = """## Kurulum

Sol paneldeki 🔑 **Secrets**'ta `OPENROUTER_API_KEY` olsun ve *Notebook access* açık olsun. Bu iki hücreyi derse girmeden çalıştırın; ders sırasında yalnızca ilgili slaytın hücresini çalıştırırsınız."""

KURULUM = '''import json, re, time
from openai import OpenAI, RateLimitError, APIStatusError
from google.colab import userdata

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=userdata.get("OPENROUTER_API_KEY"))
MODEL = "nvidia/nemotron-3.5-super-vl:free"   # yapılandırılmış çıktıyı destekler
MODEL_2 = "google/gemma-4-31b-it:free"            # strict şemayı desteklemez
BEKLE = 3                                         # dakikada 20 istek sınırı


def iste(mesajlar, model=MODEL, sicaklik=0, **ek):
    """Tek istek; 429 gelirse 30 sn bekleyip yeniden dener. Cevap nesnesini döndürür."""
    govde = dict(ek.pop("extra_body", {}))
    govde.setdefault("reasoning", {"effort": "low"})
    for deneme in range(4):
        try:
            c = client.chat.completions.create(model=model, messages=mesajlar, temperature=sicaklik,
                                               max_tokens=2000, extra_body=govde, **ek)
            time.sleep(BEKLE)
            return c
        except RateLimitError:
            print("429 · 30 sn bekleniyor…")
            time.sleep(30)
    raise RuntimeError("Üst üste 429: günlük sınır dolmuş olabilir.")


def metin(c):
    return (c.choices[0].message.content or "").strip()


def json_bul(m):
    """Cevaptaki ilk {...} bloğunu okumayı dener; okuyamazsa None."""
    b = re.search(r"\\{.*\\}", m or "", re.S)
    try:
        return json.loads(b.group(0)) if b else None
    except json.JSONDecodeError:
        return None

print("Hazır.")'''


def ust(hafta, baslik, aciklama, istek):
    return md(f"""# Hafta {hafta} · Hoca demosu: {baslik}

{aciklama}

**Kullanım:** Colab'da açın ([bağlantı]({COLAB.format(f"hafta-0{hafta}")})), kurulum hücrelerini derse girmeden çalıştırın. Ders sırasında ilgili slaytın bölümüne gidip hücreyi çalıştırın. Toplam yaklaşık **{istek} istek** (ücretsiz günlük sınır 50; lab'larla aynı anahtar).

Model cevapları her çalıştırmada değişebilir. **Ders öncesi bir kez baştan sona çalıştırın**; beklenen fark çıkmazsa slayt notundaki “çıkmazsa” cümlesini kullanın.""")


def kaydet(hafta, hucreler):
    nb = nbf.v4.new_notebook(cells=hucreler, metadata={
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "language_info": {"name": "python"}, "colab": {"provenance": []}})
    nbf.validate(nb)
    yol = KOK / f"hafta-0{hafta}/demo.ipynb"
    yol.parent.mkdir(exist_ok=True)
    nbf.write(nb, yol)
    print("✔", yol.relative_to(KOK), len(hucreler), "hücre")


# ───────────────────────── HAFTA 2 ─────────────────────────
def hafta2():
    h = [ust(2, "token ve sıcaklık",
             "İki gösterim: Türkçe ile İngilizcenin token farkı (anahtar gerekmez) ve Görev B'deki sıcaklık deneyinin hazır örnek seti. "
             "Görev B öğrencide Google AI Studio'da yapılır; bu not defteri aynı istemi API'den üç sıcaklıkta çalıştırıp karşılaştırma için örnek üretir.", 10)]
    h.append(md("## H2·3 · Bugünün sorusu: Türkçe kaç kat token?\n\nAnahtar gerekmez. o200k (GPT-4o ve sonrası) ve cl100k (GPT-4) sözlükleriyle sayar. Slayttaki beklenen: o200k 26 / 17, cl100k 36 / 17."))
    h.append(kod("""!pip -q install tiktoken
import tiktoken

TR = "Öğrencilerimizden gelen soruları cevaplayabilecek bir yapay zekâ asistanı geliştirmek istiyoruz."
EN = "We want to build an AI assistant that can answer the questions coming from our students."
for ad in ["o200k_base", "cl100k_base"]:
    enc = tiktoken.get_encoding(ad)
    tr, en = len(enc.encode(TR)), len(enc.encode(EN))
    print(f"{ad:12}  Türkçe {tr:3}   İngilizce {en:3}   oran {tr / en:.2f}")

enc = tiktoken.get_encoding("o200k_base")
print("\\nTürkçe parçalar:", [enc.decode([t]) for t in enc.encode(TR)])"""))
    h.append(md(KURULUM_MD + "\n\nH2'de öğrencilerin henüz OpenRouter anahtarı yok; bu bölüm yalnızca sizin anahtarınızla çalışır."))
    h.append(kod("!pip -q install openai"))
    h.append(kod(KURULUM))
    h.append(md("## H2·61 · Görev B: aynı istem, üç sıcaklık\n\nAI Studio'daki deneyin API karşılığı: sıcaklık 0, 1 ve 2'de üçer kez (9 istek), sonra sıcaklık 2 + top-p 0,3 (1 istek). "
                "Model `gemma-4-31b-it` (AI Studio'daki Gemma 4 31B). Düşünme kapalı; sıcaklık yalnızca son cevabı etkilesin.\n\n"
                "Beklenen: 0'da üç cevap aynı ya da çok benzer; 1'de farklı ama makul; 2'de bazen tuhaf kelimeler. Top-p düşükken cevaplar toparlanır."))
    h.append(kod("""ISTEM = "Isparta'da açılacak bir kafe için tek satırlık, akılda kalıcı bir slogan yaz. Yalnızca sloganı yaz."
KAPALI = {"reasoning": {"enabled": False}}

for s in [0, 1, 2]:
    cevaplar = [metin(iste([{"role": "user", "content": ISTEM}], model=MODEL_2, sicaklik=s, extra_body=KAPALI))
                for _ in range(3)]
    print(f"Sıcaklık {s}  ·  {len(set(cevaplar))} farklı cevap")
    for c in cevaplar:
        print("   ", c.replace("\\n", " ")[:120])

c = iste([{"role": "user", "content": ISTEM}], model=MODEL_2, sicaklik=2, top_p=0.3, extra_body=KAPALI)
print("Sıcaklık 2 + top-p 0,3:\\n   ", metin(c)[:120])"""))
    kaydet(2, h)


# ───────────────────────── HAFTA 3 ─────────────────────────
V1 = """# Rol
Müşteri yorumlarını puanlayan bir analistsin.

# Bağlam
Yorumlar bir elektronik mağazasından; ironi sık görülür.

# Çıktı biçimi
JSON, üç alan: gerekce (kısa metin), duygu (olumlu | olumsuz | karışık), puan (1–5).

# Kısıtlar ve üslup
Gerekçe en fazla 15 kelime, Türkçe. Emin değilsen "karışık" de."""


def hafta3():
    h = [ust(3, "API, hafıza ve JSON",
             "Bölüm 1 ve 3'teki kod slaytlarını canlı çalıştırmak için. Açılıştaki canlı deneme sohbet uygulamasında yapılır; buradaki hücre yedektir.", 12)]
    h.append(md(KURULUM_MD))
    h.append(kod("!pip -q install openai pydantic"))
    h.append(kod(KURULUM + "\n\nSISTEM = " + repr(V1) + """
GOREV = "Bu yorumun duygusunu ve 1–5 puanını belirle."
YORUM = "Telefon harika ama şarj aleti iki günde bozuldu."


def mesajlar(sistem, yorum):
    return [{"role": "system", "content": sistem},
            {"role": "user", "content": f"{GOREV}\\n<yorum>\\n{yorum}\\n</yorum>"}]"""))

    h.append(md("## H3·4 · Canlı deneme (yedek)\n\nSohbet uygulaması açılmazsa: aynı cümle, sistem mesajı yok, şema yok. Cevap büyük olasılıkla birkaç paragraf ve gömülü bir puan."))
    h.append(kod("""c = iste([{"role": "user", "content": f"Bu yorumu 1 ile 5 arasında puanla: {YORUM}"}])
print(metin(c))"""))

    h.append(md("## H3·18–19 · Python'dan ilk istek ve cevabın anatomisi\n\nSlayttaki kodun aynısı (sistem = `prompts/v1.txt`). İkinci hücre cevabın tamamını JSON olarak gösterir: `content`, `finish_reason`, `usage`. Slayttaki değerler örnekti; bunlar gerçek."))
    h.append(kod("""cevap = iste(mesajlar(SISTEM, YORUM), model=MODEL_2)
print(cevap.choices[0].message.content)"""))
    h.append(kod("""d = cevap.model_dump()
ozet = {"id": d["id"], "model": d["model"],
        "choices": [{"message": {"role": d["choices"][0]["message"]["role"],
                                 "content": d["choices"][0]["message"]["content"]},
                     "finish_reason": d["choices"][0]["finish_reason"]}],
        "usage": {k: d["usage"][k] for k in ("prompt_tokens", "completion_tokens", "total_tokens")}}
print(json.dumps(ozet, ensure_ascii=False, indent=2))"""))

    h.append(md("## H3·16–17 · API hafızasızdır\n\nÜç istek: (1) adımızı söyleriz, (2) geçmiş **olmadan** adımızı sorarız, (3) geçmişle birlikte sorarız. Girdi token'ının her turda nasıl büyüdüğüne bakın."))
    h.append(kod("""tur1 = [{"role": "user", "content": "Merhaba, benim adım Deniz. Kısaca selam ver."}]
c1 = iste(tur1)
print("1. tur  :", metin(c1)[:100], f"   (girdi {c1.usage.prompt_tokens} token)")

soru = {"role": "user", "content": "Benim adım ne?"}
c2 = iste([soru])
print("Geçmişsiz:", metin(c2)[:100], f"   (girdi {c2.usage.prompt_tokens} token)")

gecmisli = tur1 + [{"role": "assistant", "content": metin(c1)}, soru]
c3 = iste(gecmisli)
print("Geçmişle :", metin(c3)[:100], f"   (girdi {c3.usage.prompt_tokens} token)")"""))

    h.append(md("## H3·33 · “JSON ver” demek, JSON almak demek değil\n\nŞemasız, `prompts/v1.txt` ile üç yorum. Ham cevabı `repr` ile gösterir: kod çiti, baştaki cümle, fazladan alan. `json.loads` doğrudan okuyabiliyor mu?"))
    h.append(kod("""UC_YORUM = ["Harika! İkinci gün açılmaz oldu, tam da beklediğim gibi.",
            "Ekranı çok güzel ama pil yarım günü zor çıkarıyor.",
            "Kargo ertesi gün geldi, ürün tam anlatıldığı gibi."]
okunamayan = 0
for y in UC_YORUM:
    m = metin(iste(mesajlar(SISTEM, y), model=MODEL_2))
    try:
        json.loads(m)
        durum = "✓ json.loads okudu"
    except json.JSONDecodeError:
        okunamayan += 1
        durum = "✕ json.loads okuyamadı"
    print(durum, "→", repr(m[:140]))
print(f"\\nDoğrudan okunamayan: {okunamayan}/{len(UC_YORUM)}")"""))

    h.append(md("## H3·38 · Şema ve Pydantic\n\nAynı üç yorum, slayttaki istek: `json_schema` + `strict` + `require_parameters`, Pydantic ile doğrulama. Geçersiz sayısı 0 olmalı."))
    h.append(kod("""from typing import Literal
from pydantic import BaseModel, ConfigDict, ValidationError


class Puanlama(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gerekce: str
    duygu: Literal["olumlu", "olumsuz", "karışık"]
    puan: Literal[1, 2, 3, 4, 5]


SEMA = Puanlama.model_json_schema()
SEMALI = {"response_format": {"type": "json_schema", "json_schema": {"name": "puanlama", "strict": True, "schema": SEMA}},
          "extra_body": {"provider": {"require_parameters": True}}}

gecersiz = 0
for y in UC_YORUM:
    m = metin(iste(mesajlar(SISTEM, y), **SEMALI))
    try:
        p = Puanlama.model_validate_json(m)
        print(f"✓ {p.duygu:8} {p.puan}  ← {y[:50]}")
    except ValidationError as e:
        gecersiz += 1
        print("✕", e.errors()[0]["msg"], "→", m[:80])
print(f"\\nGeçersiz: {gecersiz}/{len(UC_YORUM)}")"""))

    h.append(md("## H3·64 · Bugünün sorusuna dönüş\n\nAçılıştaki yorum, şimdi sistem istemi ve şemayla: üç paragraf yerine tek bir JSON."))
    h.append(kod("""print(metin(iste(mesajlar(SISTEM, YORUM), **SEMALI)))"""))
    kaydet(3, h)


# ───────────────────────── HAFTA 4 ─────────────────────────
ONCE = """ÇOK ÖNEMLİ!!! Yorumları puanla.
SADECE JSON. Asla açıklama yazma.
İyi ve doğru ol."""


def hafta4():
    v = json.loads((KOK / "interaktif/src/veri/h04-arena-veri.json").read_text(encoding="utf-8"))
    gomulu = {"S0": v["sistem"]["S0"]["tr"], "S1": v["sistem"]["S1"]["tr"], "gorev": v["gorev"]["tr"],
              "hatirlat": v["hatirlat"]["tr"],
              "saldirilar": {s["no"]: s["tr"]["temiz"] + s["tr"]["enjekte"] for s in v["saldirilar"]}}
    h = [ust(4, "önce/sonra istem ve ilk saldırı",
             "Açılıştaki canlı deneme, “Aynı görev, iki istem” karşılaştırması ve etiket kaçışı. "
             "Metinler lab not defteri ve Enjeksiyon Arenası ile aynıdır (S0 = H3'teki v2 istemi).", 10)]
    h.append(md(KURULUM_MD))
    h.append(kod("!pip -q install openai"))
    h.append(kod(KURULUM + "\n\nVERI = " + pprint.pformat(gomulu, width=120, sort_dicts=False) + '''


def temizle(m):
    """S2 kod tarafı: < > işaretlerini değiştir (etiket kapatılamasın)."""
    return m.replace("<", "‹").replace(">", "›")


def mesajlar(sistem, yorum, hatirlat=False):
    k = f"{VERI['gorev']}\\n<yorum>\\n{yorum}\\n</yorum>"
    return [{"role": "system", "content": sistem},
            {"role": "user", "content": k + ("\\n" + VERI["hatirlat"] if hatirlat else "")}]


SEMA = {"type": "object", "additionalProperties": False, "required": ["gerekce", "duygu", "puan"],
        "properties": {"gerekce": {"type": "string"},
                       "duygu": {"type": "string", "enum": ["olumlu", "olumsuz", "karışık"]},
                       "puan": {"type": "integer", "enum": [1, 2, 3, 4, 5]}}}
SEMALI = {"response_format": {"type": "json_schema", "json_schema": {"name": "puanlama", "strict": True, "schema": SEMA}},
          "extra_body": {"provider": {"require_parameters": True}}}


def ozet(m):
    j = json_bul(m)
    return f"{j.get('duygu')} / {j.get('puan')}" if j else "okunamadı: " + repr(m[:60])'''))

    h.append(md("## H4·4 · Canlı deneme: H3 istemine ilk saldırı\n\nH3'teki v2 istemi (S0), şemasız, bugünün sorusundaki yorum. Saldırı başarılı sayılır: duygu olumlu ve puan ≥ 4.\n\n"
                "İsterseniz `model=MODEL_2` ile ikinci modelde de deneyin (1 istek daha)."))
    h.append(kod("""yorum = VERI["saldirilar"][1]
print("Yorum:", yorum, "\\n")
m = metin(iste(mesajlar(VERI["S0"], yorum)))
print(m)
j = json_bul(m)
if j:
    print("\\n→ Saldırı", "BAŞARILI" if j.get("duygu") == "olumlu" and int(j.get("puan", 0)) >= 4 else "başarısız")"""))

    h.append(md("## H4·14 · Aynı görev, iki istem\n\nSoldaki “önce” istem (bağırıyor, yasaklıyor, muğlak; şemasız) ile sağdaki “sonra” istem (S0: rol, bağlam, ironi örneği, strict şema). "
                "Üç ironik yorum, doğru etiket hep **olumsuz / 1**. 6 istek.\n\nFark çıkmazsa: “Güncel modeller bağıran isteme de çoğu zaman doğru cevap veriyor; fark tek denemede değil, yüzlerce yorumda ve ironi gibi zor örneklerde birikir.”"))
    h.append(kod("""IRONIK = ["Mükemmel! Kutuyu açar açmaz ekran çatladı.",
          "Harika, üçüncü kez değişime gönderiyorum; kargocuyla artık arkadaş olduk.",
          "Tam fiyatına göre bir ürün: iki gün dayandı, bravo."]

print(f"{'Yorum':48} | {'Önce':22} | {'Sonra':22}")
print("-" * 98)
for y in IRONIK:
    once = metin(iste([{"role": "system", "content": ONCE}, {"role": "user", "content": y}]))
    sonra = metin(iste(mesajlar(VERI["S0"], y), **SEMALI))
    print(f"{y[:48]:48} | {ozet(once)[:22]:22} | {ozet(sonra)[:22]:22}")"""))
    h[-1].source = "ONCE = " + repr(ONCE) + "\n" + h[-1].source

    h.append(md("## H4·25 · Etiket kaçışı\n\nLab'daki 3. saldırı: yorumun içine `</yorum>` yazmak. Önce S0 (etiket olduğu gibi), sonra S2'nin kod tarafı (`<` `>` değiştirilir) + S1 istemi + şema. "
                "Modele giden kullanıcı mesajını da yazdırır; ikincide etiketin kapatılamadığını gösterin. 2 istek."))
    h.append(kod("""yorum = VERI["saldirilar"][3]

msj = mesajlar(VERI["S0"], yorum)
print("S0 · modele giden:\\n" + msj[1]["content"])
print("→", ozet(metin(iste(msj))), "\\n")

msj = mesajlar(VERI["S1"], temizle(yorum), hatirlat=True)
print("S2 · modele giden:\\n" + msj[1]["content"])
print("→", ozet(metin(iste(msj, **SEMALI))))"""))
    kaydet(4, h)


if __name__ == "__main__":
    hafta2()
    hafta3()
    hafta4()
