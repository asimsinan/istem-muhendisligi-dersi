"""İngilizce derlemede (VITE_DIL=en) çevrilmeden kalan Türkçe yazıları listeler.
src/dil/en.json çiftlerini bellekte uygular, sonra Türkçe harf ya da sık Türkçe kelime içeren satırları yazar
(yorum satırları ve 'TR:' notları atlanır). Kullanım: python scripts-tr/ceviri_denetle.py [dosya_süzgeci]"""
import json, re, sys, glob, os
tablo = json.load(open("src/dil/en.json", encoding="utf-8"))
suz = sys.argv[1] if len(sys.argv) > 1 else ""
TR = re.compile(r"[çğıöşüÇĞİÖŞÜ]|\b(ve|bir|ile|için|bu|olan|iniyor|kelime|yazın|seçin|deneyin|olarak|sonra|önce|gibi|daha|değil|var|yok|tıklayın|açın|bakın)\b")
YORUM = re.compile(r"^\s*(//|\*|/\*|<!--)|TR:|gemma-not|Gemma'da konum|'iniyor'|'hazirlaniyor'|EkDurum|Hakkinda.svelte")
# Türkçe sürüme özgü veri (İngilizce derlemede kullanılmayan dallar) atlanır
ATLA = ("tr/Hakkinda.svelte", "store/index.ts", "utils/fetchChunks.js", "utils/gtm.svelte")
eksik = 0
for p in sorted(glob.glob("src/**/*.*", recursive=True)):
    if not p.endswith((".svelte", ".ts", ".js")) or "examples" in p or "/dil/" in p or "textbookPages.ts" in p or "params_output" in p:
        continue
    rel = os.path.relpath(p, "src")
    if suz not in rel or rel in ATLA: continue
    s = open(p, encoding="utf-8").read()
    for tr, en in tablo.get(rel, []):
        if tr not in s: print("!! BULUNAMADI", rel, tr[:60]); eksik += 1
        s = s.replace(tr, en)
    stil = False
    for i, satir in enumerate(s.split("\n"), 1):
        if "<style" in satir: stil = True
        if "</style>" in satir: stil = False; continue
        if stil or YORUM.search(satir): continue
        kod = re.sub(r"//.*$", "", satir)
        if TR.search(kod): print(f"{rel}:{i}: {satir.strip()[:170]}")
print("bulunamayan çift:", eksik)
