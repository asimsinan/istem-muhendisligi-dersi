"""hafta-03/lab.ipynb üretici (Colab not defteri). Çalıştır: python3 nb_uret.py <çıktı yolu>"""
import json
import sys

hucreler = []


def md(metin):
    hucreler.append({"cell_type": "markdown", "metadata": {}, "source": metin.strip("\n").splitlines(keepends=True)})


def kod(metin):
    hucreler.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                     "source": metin.strip("\n").splitlines(keepends=True)})


md("""
# Hafta 3 · Lab: Yorum puanlayıcı

<a href="https://colab.research.google.com/github/asimsinan/istem-muhendisligi-dersi/blob/main/hafta-03/lab.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

8 Türkçe ürün yorumunu iki istemle ve iki modelle puanlatacaksınız; doğruluğu ve geçersiz cevapları ölçeceksiniz.

| Adım | Süre | Ne yapacaksınız? |
|---|---|---|
| 1 · Kurulum | 8 dk | Anahtar, Colab Secrets, kontrol isteği |
| 2 · Zero-shot ve few-shot | 15 dk | `prompts/v1.txt` (örneksiz) ve `prompts/v2.txt` (3 örnekli) |
| 3 · JSON şeması | 18 dk | Şemasız kaç cevap bozuk? Şemayla kaç? |
| 4 · İki model | 10 dk | Aynı kod, farklı model |
| 5 · Teslim | 9 dk | Not defteri, `prompts/` ve `sonuclar.md` → GitHub `hafta-03/` |

**Önce:** *Dosya → Drive'a kopya kaydet.* Yoksa değişiklikleriniz kaybolabilir.

**Kurallar:** API anahtarı bu not defterine **asla** yazılmaz; yalnızca Colab Secrets'ta durur. Toplam ~35 istek atacağız: ücretsiz modellerde günlük 50 sınırının altında. Hücreleri yukarıdan aşağı sırayla çalıştırın.
""")

md("""
## Adım 1 · Kurulum (8 dk)

1. [openrouter.ai](https://openrouter.ai) → **Keys** → **Create Key**. Anahtarı kopyalayın; bir daha gösterilmez.
2. Colab'da soldaki 🔑 **Secrets** paneli → **Add new secret**. Ad: `OPENROUTER_API_KEY`, değer: anahtarınız.
3. **Notebook access** anahtarını açın.
4. Aşağıdaki hücreleri sırayla çalıştırın.
""")

kod("""
!pip install -q openai pydantic
""")

kod("""
import os, json, time, re
from openai import OpenAI, RateLimitError, APIStatusError, InternalServerError, APIConnectionError, APITimeoutError
from google.colab import userdata

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=userdata.get("OPENROUTER_API_KEY"),   # anahtar Secrets'tan okunur, burada yazmaz
)

MODEL = "nvidia/nemotron-3.5-super-vl:free"   # yapılandırılmış çıktıyı destekler
MODEL_2 = "recursive/flint-v1.0:free"            # strict şemayı desteklemez (Adım 4)
BEKLE = 3          # istekler arası saniye: dakikada 20 sınırının altında kalmak için
os.makedirs("prompts", exist_ok=True)
SONUCLAR = []      # her çalıştırmanın özeti; sonunda sonuclar.md'ye yazılır


class GeciciHata(Exception):
    \"\"\"Sağlayıcı 200 döndürdü ama cevap boş (ücretsiz modellerde ara sıra olur).\"\"\"


def iste(mesajlar, model=MODEL, **ek):
    \"\"\"Tek istek atar; 429 ya da geçici sağlayıcı hatasında bekleyip yeniden dener. (cevap, süre) döndürür.\"\"\"
    # İki model de "düşünebilen" (reasoning) model: düşünmeyi düşük tutuyoruz; düşünme token'ları
    # cevaptan önce harcandığı için max_tokens'ı geniş bırakıyoruz (yoksa cevap boş/yarım kalabilir).
    govde = dict(ek.pop("extra_body", {}))
    govde.setdefault("reasoning", {"effort": "low"})
    for deneme in range(6):
        try:
            t0 = time.time()
            cevap = client.chat.completions.create(
                model=model, messages=mesajlar, temperature=0, max_tokens=2000, extra_body=govde, **ek)
            sure = time.time() - t0
            if not cevap.choices:
                raise GeciciHata("boş cevap")
            time.sleep(BEKLE)
            return cevap, sure
        except RateLimitError:
            bekle = 15 * (deneme + 1)
            print(f"429 · sınır ya da ücretsiz sağlayıcı yoğun; {bekle} sn bekleniyor ({deneme + 1}/6)")
        except (InternalServerError, APIConnectionError, APITimeoutError, GeciciHata) as h:
            bekle = 10 * (deneme + 1)
            print(f"Sağlayıcı geçici hata verdi ({type(h).__name__}); {bekle} sn sonra yeniden ({deneme + 1}/6)")
        time.sleep(bekle)
    raise RuntimeError("Üst üste hata: ücretsiz sağlayıcı yoğun ya da günlük sınır dolmuş olabilir. Birkaç dakika sonra hücreyi yeniden çalıştırın.")

print("Hazır. Model:", MODEL)
""")

md("""
**Kontrol:** Tek bir istek atalım. Cevabı, cevap veren modelin adını ve token sayılarını görmelisiniz.
""")

kod("""
cevap, sure = iste([{"role": "user", "content": "Merhaba! Tek cümleyle kendini tanıt."}])
print("Model  :", cevap.model)
print("Cevap  :", cevap.choices[0].message.content)
print("Token  :", cevap.usage)   # completion_tokens düşünme (reasoning) token'larını da içerebilir
print(f"Süre   : {sure:.1f} sn")
""")

md("""
## Adım 2 · Zero-shot ve few-shot (15 dk)

İstem ayrı bir dosyada duruyor: `prompts/v1.txt`. Bu **sistem mesajı**dır (rol, bağlam, biçim, kısıtlar). Her yorum için **kullanıcı mesajı** görevi ve yorumu `<yorum>` etiketi içinde taşır.
""")

kod("""
%%writefile prompts/v1.txt
# Rol
Müşteri yorumlarını puanlayan bir analistsin.

# Bağlam
Yorumlar bir elektronik mağazasından; ironi sık görülür.

# Çıktı biçimi
JSON, üç alan: gerekce (kısa metin), duygu (olumlu | olumsuz | karışık), puan (1–5).

# Kısıtlar ve üslup
Gerekçe en fazla 15 kelime, Türkçe. Emin değilsen "karışık" de.
""")

md("""
Test verisi: 8 yorum ve doğru etiketleri. **Bu yorumları istemde örnek olarak kullanmayın**; yoksa ölçtüğünüz doğruluk sahte olur.
""")

kod("""
YORUMLAR = [
    ("Kargo ertesi gün geldi, ürün tam anlatıldığı gibi. Teşekkürler.", "olumlu", 5),
    ("Ekranı çok güzel ama pil yarım günü zor çıkarıyor.", "karışık", 3),
    ("Harika! İkinci gün açılmaz oldu, tam da beklediğim gibi.", "olumsuz", 1),
    ("Satıcı iade talebime üç haftadır cevap vermiyor.", "olumsuz", 1),
    ("Fiyatına göre idare eder, çok beklentiye girmeyin.", "karışık", 3),
    ("Kulaklığın sesi temiz, bas biraz zayıf ama bu fiyata çok iyi.", "olumlu", 4),
    ("Kutudan çizik çıktı ama değişim hızlı yapıldı, şimdi memnunum.", "olumlu", 4),
    ("Ne diyeyim, bir yıldır kullanıyorum, şikâyetim yok.", "olumlu", 4),
]
GOREV = "Bu yorumun duygusunu ve 1–5 puanını belirle."


def mesajlar(sistem, yorum):
    return [
        {"role": "system", "content": sistem},
        {"role": "user", "content": f"{GOREV}\\n<yorum>\\n{yorum}\\n</yorum>"},
    ]


def temizle(metin):
    \"\"\"Cevaptaki ilk {...} bloğunu bulup JSON olarak okumayı dener (şemasız mod için yardımcı).\"\"\"
    m = re.search(r"\\{.*\\}", metin or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def puanla(istem_dosyasi, model=MODEL, sema=None, etiket="", zorunlu=True):
    \"\"\"8 yorumu puanlatır, tabloyu yazdırır, özeti SONUCLAR'a ekler ve ham cevapları döndürür.\"\"\"
    sistem = open(istem_dosyasi, encoding="utf-8").read()
    ek = {}
    if sema is not None:
        ek["response_format"] = {"type": "json_schema",
                                 "json_schema": {"name": "puanlama", "strict": True, "schema": sema}}
        if zorunlu:
            ek["extra_body"] = {"provider": {"require_parameters": True}}
    satirlar, ham = [], []
    dogru_duygu = puan_yakin = gecersiz_ham = gecersiz_temiz = 0
    toplam_token, toplam_sure = 0, 0.0
    for yorum, d_duygu, d_puan in YORUMLAR:
        cevap, sure = iste(mesajlar(sistem, yorum), model=model, **ek)
        metin = cevap.choices[0].message.content or ""
        ham.append(metin)
        toplam_sure += sure
        toplam_token += cevap.usage.total_tokens if cevap.usage else 0
        try:
            json.loads(metin)          # program gözüyle: olduğu gibi okunuyor mu?
        except json.JSONDecodeError:
            gecersiz_ham += 1
        veri = temizle(metin)
        if veri is None:
            gecersiz_temiz += 1
            satirlar.append((yorum[:38], d_duygu, "—", "—", "✗ okunamadı"))
            continue
        duygu, puan = veri.get("duygu"), veri.get("puan")
        dogru = duygu == d_duygu
        dogru_duygu += dogru
        try:
            puan_yakin += abs(int(puan) - d_puan) <= 1
        except (TypeError, ValueError):
            pass
        satirlar.append((yorum[:38], d_duygu, str(duygu), str(puan), "✓" if dogru else "✗"))
    print(f"{'Yorum':40} {'Doğru':9} {'Model':9} {'Puan':5} Sonuç")
    for s in satirlar:
        print(f"{s[0]:40} {s[1]:9} {s[2]:9} {s[3]:5} {s[4]}")
    n = len(YORUMLAR)
    ozet = {"model": model.split("/")[-1], "istem": os.path.basename(istem_dosyasi), "sema": "var" if sema else "yok",
            "dogruluk": f"{dogru_duygu}/{n}", "puan_yakin": f"{puan_yakin}/{n}", "gecersiz": f"{gecersiz_ham}/{n}",
            "sure": f"{toplam_sure / n:.1f}", "token": toplam_token, "etiket": etiket}
    print(f"\\nDuygu doğruluğu: {ozet['dogruluk']} · puan ±1: {ozet['puan_yakin']} · "
          f"json.loads ile okunamayan: {ozet['gecersiz']} · ort. süre {ozet['sure']} sn · toplam {toplam_token} token")
    SONUCLAR.append(ozet)
    return ham
""")

kod("""
ham_v1 = puanla("prompts/v1.txt", etiket="zero-shot")
""")

md("""
Şimdi aynı isteme 3 örnek ekleyelim (`prompts/v2.txt`). Örnekler test yorumlarından **farklı**; her duygudan bir tane, üçüncüsü ironi.
""")

kod("""
%%writefile prompts/v2.txt
# Rol
Müşteri yorumlarını puanlayan bir analistsin.

# Bağlam
Yorumlar bir elektronik mağazasından; ironi sık görülür.

# Örnekler
<ornek>
Yorum: Paketleme özenliydi, blender çok güçlü.
Çıktı: {"gerekce": "Paketleme ve performans övülmüş.", "duygu": "olumlu", "puan": 5}
</ornek>
<ornek>
Yorum: Kamera iyi ama hoparlör cızırtılı.
Çıktı: {"gerekce": "Bir yön iyi, bir yön kötü.", "duygu": "karışık", "puan": 3}
</ornek>
<ornek>
Yorum: Süper, kılavuz bile eksik çıktı.
Çıktı: {"gerekce": "İroni: 'süper' denmiş ama şikâyet var.", "duygu": "olumsuz", "puan": 1}
</ornek>

# Çıktı biçimi
JSON, üç alan: gerekce (kısa metin), duygu (olumlu | olumsuz | karışık), puan (1–5).

# Kısıtlar ve üslup
Gerekçe en fazla 15 kelime, Türkçe. Emin değilsen "karışık" de.
""")

kod("""
ham_v2 = puanla("prompts/v2.txt", etiket="few-shot")
""")

md("""
**Soru (sonuclar.md'ye yazın):** Örnekler doğruluğu artırdı mı? Hangi yorumda hâlâ yanılıyor? Neden olabilir?

## Adım 3 · JSON şeması (18 dk)

Şimdiye kadar modelden JSON'u yalnızca **rica ettik**. Yukarıdaki tabloların altındaki “json.loads ile okunamayan” sayısına bakın: Bir program cevabı olduğu gibi okusaydı kaç tanesinde dururdu? (`temizle()` bu cevapları kurtarmaya çalışıyor; gerçek bir programda buna güvenmek istemeyiz.)

Önce iki ham cevaba göz atalım:
""")

kod("""
for metin in ham_v2[:2]:
    print(repr(metin))
    print("---")
""")

md("""
Şimdi şemayı Pydantic ile yazıp API'ye gönderiyoruz: `response_format` + `strict: True`. `require_parameters` ise OpenRouter'a “yalnızca şemayı destekleyen bir sağlayıcıya gönder” der.
""")

kod("""
from typing import Literal
from pydantic import BaseModel, ConfigDict, ValidationError


class Puanlama(BaseModel):
    model_config = ConfigDict(extra="forbid")   # şemada olmayan alan yok
    gerekce: str                                # önce gerekçe, sonra puan
    duygu: Literal["olumlu", "olumsuz", "karışık"]
    puan: Literal[1, 2, 3, 4, 5]


SEMA = Puanlama.model_json_schema()
print(json.dumps(SEMA, ensure_ascii=False, indent=2))
""")

kod("""
ham_sema = puanla("prompts/v2.txt", sema=SEMA, etiket="few-shot + şema")

# Pydantic ile doğrulama: şemaya uymayan cevap sayısı
gecersiz = 0
for metin in ham_sema:
    try:
        Puanlama.model_validate_json(metin)
    except ValidationError as h:
        gecersiz += 1
        print("Geçersiz:", h.errors()[0]["msg"], "→", metin[:80])
print(f"Pydantic doğrulamasından geçemeyen: {gecersiz}/{len(ham_sema)}")
""")

md("""
**Soru:** Şemasız kaç cevap okunamadı, şemayla kaç? Şema doğruluğu da değiştirdi mi? (İpucu: şema biçimi garanti eder, doğruluğu değil.)

## Adım 4 · İki model (10 dk)

Aynı kod, yalnızca model adı değişiyor. `MODEL_2` strict şemayı desteklemiyor: `require_parameters` açıkken uygun sağlayıcı bulunamayabilir. O durumda şemayı yine gönderip `require_parameters`'ı kapatıyoruz; cevap gelir ama şema **garanti değildir**.
""")

kod("""
try:
    ham_m2 = puanla("prompts/v2.txt", model=MODEL_2, sema=SEMA, etiket="few-shot + şema")
except APIStatusError as h:
    print(f"İstek reddedildi ({h.status_code}): {str(h)[:160]}")
    print("→ Bu model şemayı desteklemiyor. require_parameters kapatılarak tekrar deneniyor (şema garanti değil).\\n")
    ham_m2 = puanla("prompts/v2.txt", model=MODEL_2, sema=SEMA, zorunlu=False,
                    etiket="few-shot + şema, require_parameters kapalı")

gecersiz = 0
for metin in ham_m2:
    try:
        Puanlama.model_validate_json(metin)
    except ValidationError:
        gecersiz += 1
print(f"\\n{MODEL_2}: Pydantic doğrulamasından geçemeyen {gecersiz}/{len(ham_m2)}")
""")

md("""
## Sonuç tablosu

Aşağıdaki hücre `sonuclar.md` dosyasını yazar. Altına kendi yorumunuzu ekleyin (2–4 cümle): Hangi değişiklik en çok işe yaradı? Hangi model, neden?
""")

kod("""
satirlar = ["# Hafta 3 · Lab sonuçları", "",
            "| Model | İstem | Şema | Duygu doğruluğu | Puan ±1 | json.loads ile okunamayan | Ort. süre (sn) | Toplam token | Not |",
            "|---|---|---|---|---|---|---|---|---|"]
for s in SONUCLAR:
    satirlar.append(f"| {s['model']} | {s['istem']} | {s['sema']} | {s['dogruluk']} | {s['puan_yakin']} | "
                    f"{s['gecersiz']} | {s['sure']} | {s['token']} | {s['etiket']} |")
satirlar += ["", "## Yorumum", "", "(Buraya 2–4 cümle yazın.)", ""]
open("sonuclar.md", "w", encoding="utf-8").write("\\n".join(satirlar))
print("\\n".join(satirlar))
""")

md("""
## Adım 5 · Teslim (9 dk)

1. Aşağıdaki kontrol hücresini çalıştırın: Not defterinde anahtar yazılı olmamalı.
2. **Dosya → GitHub'a kopya kaydet** → kendi reponuz, yol: `hafta-03/lab.ipynb`. (İlk kullanımda GitHub izni ister; özel repo için “Include private repos”u işaretleyin.)
3. Son hücre `prompts/v1.txt`, `prompts/v2.txt` ve `sonuclar.md` dosyalarını indirir. Bunları GitHub'da `hafta-03/` klasörüne yükleyin (`prompts/` alt klasörüyle).

**Ödev:** İsteminizde **tek** bir değişiklik yapın (`prompts/v3.txt`), aynı 8 yorumla ölçün (`puanla("prompts/v3.txt", ...)`), sonucu `sonuclar.md`'ye ekleyip Git'e işleyin.
""")

kod("""
# Anahtar kontrolü: bu oturumda çalıştırılan hücrelerde "sk-or-" ile başlayan bir metin var mı?
sizinti = [h for h in _ih if "sk-or-" in h and "sizinti" not in h]
print("⚠️ Anahtar not defterinde yazılı! Silin ve OpenRouter'da anahtarı iptal edin." if sizinti
      else "✓ Not defterinde anahtar yok.")
""")

kod("""
from google.colab import files
for yol in ["prompts/v1.txt", "prompts/v2.txt", "sonuclar.md"]:
    files.download(yol)
""")

nb = {
    "nbformat": 4, "nbformat_minor": 0,
    "metadata": {"colab": {"provenance": [], "name": "hafta-03-lab.ipynb"},
                 "kernelspec": {"name": "python3", "display_name": "Python 3"},
                 "language_info": {"name": "python"}},
    "cells": hucreler,
}
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)
print("✔", sys.argv[1], len(hucreler), "hücre")
