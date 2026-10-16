"""textbookPages.ts içindeki sayfa başlık/içeriklerini çıkarır ya da Türkçesini yazar.
python scripts-tr/sayfalar.py cikar > /tmp/sayfalar_en.json
python scripts-tr/sayfalar.py yaz scripts-tr/sayfalar_tr.json
"""
import json, re, sys
P = "src/utils/textbookPages.ts"

def bloklar(s):
    konumlar = [m.start() for m in re.finditer(r"\n\t\{\n\t\tid: '", s)]
    konumlar.append(len(s))
    for a, b in zip(konumlar, konumlar[1:]):
        yield a, b

def icerik_bul(blok):
    m = re.search(r"content:\s*(['`])", blok)
    if not m: return None
    q = m.group(1); i = m.end()
    j = i
    while True:
        j = blok.index(q, j)
        if blok[j-1] != "\\": break
        j += 1
    return m.start(), i, j  # içerik blok[i:j]

s = open(P, encoding="utf-8").read()
if sys.argv[1] == "cikar":
    out = {}
    for a, b in bloklar(s):
        blok = s[a:b]
        id_ = re.search(r"id: '([^']*)'", blok).group(1)
        t = re.search(r"title: '([^']*)'", blok).group(1)
        r = icerik_bul(blok)
        out[id_] = {"title": t, "content": blok[r[1]:r[2]] if r else None}
    print(json.dumps(out, ensure_ascii=False, indent=1))
else:
    tr = json.load(open(sys.argv[2], encoding="utf-8"))
    parcalar = []; son = 0
    for a, b in bloklar(s):
        blok = s[a:b]
        id_ = re.search(r"id: '([^']*)'", blok).group(1)
        if id_ in tr:
            blok = re.sub(r"title: '[^']*'", "title: " + json.dumps(tr[id_]["title"], ensure_ascii=False).replace('"', "'"), blok, count=1)
            r = icerik_bul(blok)
            if r and tr[id_].get("content"):
                yeni = tr[id_]["content"].replace("`", "'")
                blok = blok[:r[0]] + "content: `" + yeni + "`" + blok[r[2]+1:]
        parcalar.append(s[son:a]); parcalar.append(blok); son = b
    parcalar.append(s[son:])
    open(P, "w", encoding="utf-8").write("".join(parcalar))
    print("yazıldı")
