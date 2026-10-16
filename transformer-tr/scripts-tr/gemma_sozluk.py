"""Gemma 3 270M sözlüğünü (262 bin parça) Türkçe + İngilizce metinde kullanılan ~40 bin parçaya indirir.

Gemma BPE kullanır: bir parça, iki küçük parçanın birleşmesiyle oluşur. Bu yüzden tutulan her parçanın
"ataları" da (onu üreten birleştirmenin iki yarısı) tutulur; yoksa tokenizer o parçaya ulaşamaz.
Bayt yedekleri (<0x00>…<0xFF>) hep tutulur: sözlükte olmayan karakter yine yazılabilir.

Derlem: Vikipedi (tr, en) örnekleri + ders metinleri. Çıktılar (params_output/gemma/):
  tokenizer.json   budanmış; <pad> <eos> <bos> <unk> numaraları 0–3 korunur
  eski_idler.json  yeni numara → asıl numara
Kullanım: python scripts-tr/gemma_sozluk.py   (proje kökünden; venv: torch + tokenizers + datasets)
"""
import json, os, glob, collections, itertools
from tokenizers import Tokenizer
from datasets import load_dataset

HEDEF = 40000
CIKTI = "src/utils/model/params_output/gemma"
os.makedirs(CIKTI, exist_ok=True)
yol = glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--unsloth--gemma-3-270m/snapshots/*/tokenizer.json"))[0]
tok = Tokenizer.from_file(yol)
sayac = collections.Counter()
deneme_metinleri = []

def say(metin):
    sayac.update(tok.encode(metin, add_special_tokens=False).ids)

for dil, adet in [("tr", 6000), ("en", 3000)]:
    ds = load_dataset("wikimedia/wikipedia", f"20231101.{dil}", split="train", streaming=True)
    for i, ornek in enumerate(itertools.islice(ds, adet + 300)):
        if i < adet:
            say(ornek["text"][:4000])
        else:  # ayrı tutulan metin: budanmış tokenizer'ın asılla ne kadar aynı böldüğünü ölçmek için
            deneme_metinleri.append(ornek["text"][:2000])
    print(dil, "bitti; farklı parça:", len(sayac))

ek = ["Isparta'nın en meşhur ürünü", "Bir varmış bir yokmuş, evvel zaman içinde", "Ali kitabı Ayşe'ye verdi çünkü o",
      "Denizde yüzdükten sonra yüzünü", "Türkiye'nin başkenti", "Öğrencilerimizden gelen soruları cevaplayabilecek bir yapay zekâ asistanı geliştirmek istiyoruz.",
      "çğıöşüÇĞİÖŞÜâîû 0123456789 .,;:!?'\"()[]{}-–—…/\\@#%&*+=<>|~^_`$€₺"]
for e in ek:
    for _ in range(50):
        say(e)

d = json.load(open(yol))
vocab = d["model"]["vocab"]                       # parça → numara
ad = {i: t for t, i in vocab.items()}             # numara → parça
ozel = [0, 1, 2, 3]
baytlar = {vocab[f"<0x{b:02X}>"] for b in range(256)}
tek = {i for i in sayac if len(ad[i].replace("▁", "")) <= 1}
secim = set(ozel) | baytlar | tek
for i, _ in sayac.most_common():
    if len(secim) >= HEDEF:
        break
    secim.add(i)

# Atalar: her parça için onu üreten en öncelikli birleştirme
birlesmeler = [m if isinstance(m, list) else m.split(" ") for m in d["model"]["merges"]]
ilk = {}
for a, b in birlesmeler:
    ilk.setdefault(a + b, (a, b))
yigin = [ad[i] for i in secim]
while yigin:
    t = yigin.pop()
    if t in ilk:
        for p in ilk[t]:
            if vocab[p] not in secim:
                secim.add(vocab[p]); yigin.append(p)
print("atalarla tutulan parça:", len(secim))

yeni_eski = ozel + sorted(secim - set(ozel))
yeni_no = {e: y for y, e in enumerate(yeni_eski)}
tutulan = {ad[i] for i in yeni_eski}
print("derlemdeki kapsama:", round(sum(sayac[i] for i in yeni_eski) / sum(sayac.values()) * 100, 3), "%")

d["model"]["vocab"] = {ad[e]: y for y, e in enumerate(yeni_eski)}
d["model"]["merges"] = [f"{a} {b}" for a, b in birlesmeler if a in tutulan and b in tutulan and a + b in tutulan]
d["added_tokens"] = [dict(a, id=yeni_no[a["id"]]) for a in d["added_tokens"] if a["id"] in yeni_no]
# transformers.js (2.x) eklenmiş parçaları listedeki sırayla arar: "\n" önce gelirse "\n\n" hiç eşleşmez.
# Uzundan kısaya sıralayınca Python'daki "en uzun eşleşme" davranışı elde edilir (numaralar değişmez).
d["added_tokens"].sort(key=lambda a: -len(a["content"]))
print("birleştirme:", len(d["model"]["merges"]), "· eklenmiş özel parça:", len(d["added_tokens"]))
json.dump(d, open(f"{CIKTI}/tokenizer.json", "w"), ensure_ascii=False)
json.dump(yeni_eski, open(f"{CIKTI}/eski_idler.json", "w"))
json.dump({"tokenizer_class": "GemmaTokenizer", "add_bos_token": True, "add_eos_token": False,
           "bos_token": "<bos>", "eos_token": "<eos>", "pad_token": "<pad>", "unk_token": "<unk>",
           "model_max_length": 1024, "clean_up_tokenization_spaces": False},
          open(f"{CIKTI}/tokenizer_config.json", "w"), ensure_ascii=False, indent=1)

# Doğrulama: budanmış tokenizer, asılla aynı parçaları vermeli
yeni = Tokenizer.from_file(f"{CIKTI}/tokenizer.json")
yad = {i: t for t, i in d["model"]["vocab"].items()}
def ayni(e):
    return [ad[i] for i in tok.encode(e).ids] == [yad[i] for i in yeni.encode(e).ids]
for e in ek[:6] + ["Annem sabah erkenden kalkıp bize sıcak bir kahvaltı hazırladı.", "The quick brown fox jumps over the lazy dog."]:
    print("✓" if ayni(e) else "≠", e[:50], "" if ayni(e) else [yad[i] for i in yeni.encode(e).ids])
kel = [w for m in deneme_metinleri for w in m.split()]
print("ayrı metinde kelime bazında aynı bölme:", round(sum(ayni(" " + w) for w in kel) / len(kel) * 100, 2), "%",
      "· metin bazında:", sum(ayni(m) for m in deneme_metinleri), "/", len(deneme_metinleri))
