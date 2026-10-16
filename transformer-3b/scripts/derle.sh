#!/usr/bin/env bash
# TR: 3B görünümü iki dilde derler ve ders sitesine (interaktif/public/transformer-3b) kurar.
#   Türkçe:    /transformer-3b/     Türkçe GPT-2   (public/model, public/tokenizer)
#   İngilizce: /transformer-3b/en/  OpenAI GPT-2   (dil-en/model, dil-en/tokenizer)
# Model parçaları depoya eklenmez (.gitignore); yayında Hugging Face'ten iner (model-3b, model-3b-en), sitedeki kopya
# yerel deneme ve yedek içindir. Parçaları üretmek için README-TR.md'deki agirlik_aktar.py adımlarına bakın.
# Kullanım (transformer-3b kökünden): bash scripts/derle.sh
set -euo pipefail
P=../interaktif/public/transformer-3b

npx tsc --noEmit -p .
rm -rf out && npx next build                       # Türkçe: out/model = public/model
rm -rf "${P:?}" && cp -r out "$P"

rm -rf out && NEXT_PUBLIC_DIL=en NEXT_PUBLIC_TABAN=/transformer-3b/en npx next build
rm -rf out/model out/tokenizer
cp -r dil-en/tokenizer out/tokenizer
[ -d dil-en/model ] && cp -r dil-en/model out/model
mkdir -p "$P/en" && cp -r out/. "$P/en/"
echo "✔ $P (TR) ve $P/en (EN) hazır"
