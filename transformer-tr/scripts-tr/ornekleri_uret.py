"""Türkçe hazır örnekleri (src/constants/examples/ex0..ex4.js) üretir.
Telefonda model indirilmediğinde bu önceden hesaplanmış çıktılar gösterilir.
Kullanım (transformer-tr kökünden):  python scripts-tr/ornekleri_uret.py        (Türkçe → src/constants/examples)
                                     python scripts-tr/ornekleri_uret.py en     (İngilizce, OpenAI GPT-2 → src/constants/examples-en)
"""
import sys
EN = len(sys.argv) > 1 and sys.argv[1] == "en"
import json, math
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

MODEL = "src/utils/model/params_output/" + ("gpt2-en-final.onnx" if EN else "gpt2-tr-final.onnx")
KLASOR = "src/constants/examples-en" if EN else "src/constants/examples"
ORNEKLER = [
    "Türkiye'nin başkenti",
    "Ali kitabı Ayşe'ye verdi çünkü o",
    "Denizde yüzdükten sonra yüzünü",
    "Isparta'nın en meşhur ürünü",
    "Bir varmış bir yokmuş, evvel zaman içinde",
]
if EN:
    ORNEKLER = [
        "The capital of France is",
        "Alice gave the book to Mary because she",
        "Data visualization empowers users to",
        "The most famous dish in Italy is",
        "Once upon a time, in a land far away,",
    ]
SICAKLIK, K, MAKS = 0.8, 5, 50

tok = AutoTokenizer.from_pretrained("openai-community/gpt2" if EN else "ytu-ce-cosmos/turkish-gpt2")
oturum = ort.InferenceSession(MODEL)
adlar = [o.name for o in oturum.get_outputs()]

def goster(t):  # TE'deki formatTokenForDisplay ile aynı
    import re
    t = t.replace("\n", "[NEWLINE]").replace("\t", "[TAB]").replace("\r", "[CR]")
    return re.sub(r"\s{2,}", lambda m: f"[{len(m.group(0))} SPACES]", t)

for n, metin in enumerate(ORNEKLER):
    ids = tok.encode(metin)
    cikti = oturum.run(None, {"input": np.array([ids], dtype=np.int64)})
    outputs = {}
    for ad, deger in zip(adlar, cikti):
        if ad == "linear_output":
            logits = deger.reshape(-1)[-50257:].astype(float).tolist()
            continue
        d = deger[0] if deger.shape[0] == 1 else deger  # TE: tek boyutlu batch atılır
        outputs[ad] = {"data": np.round(d.astype(float), 5).tolist()}
    sirali = sorted(range(len(logits)), key=lambda i: -logits[i])[:MAKS]
    olcekli = [logits[i] / SICAKLIK for i in sirali]
    topk = [v if r < K else -math.inf for r, v in enumerate(olcekli)]
    m = max(topk); ex = [0.0 if v == -math.inf else math.exp(v - m) for v in topk]; s = sum(ex)
    olas = [{"tokenId": i, "logit": logits[i], "scaledLogit": olcekli[r], "topKLogit": topk[r] if topk[r] != -math.inf else None,
             "rank": r, "token": goster(tok.decode([i])), "expLogit": ex[r], "probability": ex[r] / s} for r, i in enumerate(sirali)]
    veri = {"prompt": metin, "tokens": [tok.decode([i]) for i in ids], "tokenIds": ids, "logits": logits,
            "outputs": outputs, "probabilities": olas, "sampled": olas[0]}
    js = f"export const ex{n} = " + json.dumps(veri, ensure_ascii=False).replace("null", "-Infinity") + ";\n"
    open(f"{KLASOR}/ex{n}.js", "w", encoding="utf-8").write(js)
    print(f"ex{n}", metin, "→", [o["token"] for o in olas[:3]], f"{len(js)/1e6:.1f} MB")
