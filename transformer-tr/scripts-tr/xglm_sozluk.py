"""XGLM-564M sözlüğünü (256 bin parça) Türkçe + İngilizce metinde kullanılan ~40 bin parçaya indirir.

Derlem: Vikipedi (tr, en) örnekleri + ders metinleri. Çıktılar:
  params_output/xglm/tokenizer.json  (budanmış; özel token numaraları 0–3 korunur)
  params_output/xglm/eski_idler.json (yeni numara → asıl numara)
Kullanım: python scripts-tr/xglm_sozluk.py
"""
import json, os, collections, itertools
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer
from datasets import load_dataset

HEDEF = 40000
CIKTI = "src/utils/model/params_output/xglm"
os.makedirs(CIKTI, exist_ok=True)
yol = hf_hub_download("facebook/xglm-564M", "tokenizer.json")
tok = Tokenizer.from_file(yol)
sayac = collections.Counter()

def say(metin):
    sayac.update(tok.encode(metin, add_special_tokens=False).ids)

for dil, adet in [("tr", 6000), ("en", 3000)]:
    ds = load_dataset("wikimedia/wikipedia", f"20231101.{dil}", split="train", streaming=True)
    for i, ornek in enumerate(itertools.islice(ds, adet)):
        say(ornek["text"][:4000])
    print(dil, "bitti; farklı parça:", len(sayac))

ek = ["Isparta'nın en meşhur ürünü", "Bir varmış bir yokmuş, evvel zaman içinde", "Ali kitabı Ayşe'ye verdi çünkü o",
      "Denizde yüzdükten sonra yüzünü", "Türkiye'nin başkenti", "Öğrencilerimizden gelen soruları cevaplayabilecek bir yapay zekâ asistanı geliştirmek istiyoruz.",
      "çğıöşüÇĞİÖŞÜâîû 0123456789 .,;:!?'\"()[]{}-–—…/\\@#%&*+=<>|~^_`$€₺", ]
for e in ek:
    for _ in range(50):
        say(e)

d = json.load(open(yol))
vocab = d["model"]["vocab"]
ozel = [0, 1, 2, 3]
# tek karakterlik parçaların hepsini (derlemde geçenleri) koru; kalanları sıklığa göre
tek = {i for i in sayac if len(vocab[i][0].replace("▁", "")) <= 1}
sirali = [i for i, _ in sayac.most_common() if i not in ozel]
secim = set(tek)
for i in sirali:
    if len(secim) >= HEDEF - len(ozel):
        break
    secim.add(i)
yeni_eski = ozel + sorted(secim - set(ozel))
print("tutulan parça:", len(yeni_eski), "· derlemdeki kapsama:",
      round(sum(sayac[i] for i in yeni_eski) / sum(sayac.values()) * 100, 3), "%")

d["model"]["vocab"] = [vocab[i] for i in yeni_eski]
d["model"]["unk_id"] = 3
d["added_tokens"] = [a for a in d["added_tokens"] if a["id"] < 4]
json.dump(d, open(f"{CIKTI}/tokenizer.json", "w"), ensure_ascii=False)
json.dump(yeni_eski, open(f"{CIKTI}/eski_idler.json", "w"))

# Doğrulama: budanmış tokenizer, ders cümlelerinde asılla aynı parçaları vermeli
yeni = Tokenizer.from_file(f"{CIKTI}/tokenizer.json")
for e in ek[:6] + ["Annem sabah erkenden kalkıp bize sıcak bir kahvaltı hazırladı.", "The quick brown fox jumps over the lazy dog."]:
    a = [vocab[i][0] for i in tok.encode(e).ids]
    b = [d["model"]["vocab"][i][0] for i in yeni.encode(e).ids]
    print("✓" if a == b else "≠", e[:40], b if a != b else "")
