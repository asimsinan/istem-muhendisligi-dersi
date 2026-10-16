#!/usr/bin/env bash
# TR: 2B sayfanın İngilizce sürümünü (OpenAI GPT-2) derler ve ders sitesine /transformer/en/ olarak kurar.
# Önce model parçaları: static/model-en/gpt2-en.onnx.part0..21 (README-TR.md, "İngilizce sürüm") ve
# static/tokenizer/gpt2-en/. Arayüz çevirisi: src/dil/en.json + src/dil/sayfalar_en.json (vite.config.ts).
# Kullanım (transformer-tr kökünden): bash scripts-tr/derle_en.sh   — ardından Türkçe derleme her zamanki gibi.
set -euo pipefail
python3 scripts-tr/ceviri_denetle.py | tail -1
VITE_DIL=en npm run build
python3 - <<'PY'
import json
t = json.load(open("src/dil/en.json", encoding="utf-8"))["@app.html"]
p = "build/index.html"; s = open(p, encoding="utf-8").read()
for tr, en in t:
    assert tr in s, tr[:60]; s = s.replace(tr, en)
open(p, "w", encoding="utf-8").write(s)
PY
P=../interaktif/public/transformer/en
rm -rf "${P:?}" && mkdir -p "$P/tokenizer"
cp -r build/_app build/index.html build/favicon.png build/robots.txt "$P/"
cp -r build/tokenizer/gpt2-en "$P/tokenizer/"
# Model parçaları /transformer/model-en altında (Türkçe derlemenin static klasöründen gelir; depoya eklenmez)
mkdir -p ../interaktif/public/transformer/model-en && cp static/model-en/* ../interaktif/public/transformer/model-en/
echo "✔ $P"
