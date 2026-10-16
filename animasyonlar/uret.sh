#!/bin/bash
# Bir Manim sahnesini derse hazır MP4 + kapak PNG olarak üretir.
# Kullanım (proje kökünden):  bash animasyonlar/uret.sh animasyonlar/h02/m2_1_bpe.py Bpe h02-m2.1-bpe
# Çıktı: animasyonlar/render/<ad>.mp4 (H.264 High, yuv420p, +faststart, sessiz) ve <ad>-kapak.png (son kare)
set -e
DOSYA="$1"; SINIF="$2"; AD="$3"
MANIM="${MANIM:-$(command -v manim || echo /home/claude/.venv-manim/bin/manim)}"
GECICI=$(mktemp -d)
"$MANIM" -qh --progress_bar none --media_dir "$GECICI" --disable_caching "$DOSYA" "$SINIF" >/dev/null
HAM=$(find "$GECICI" -name "$SINIF.mp4" | head -1)
mkdir -p animasyonlar/render
ffmpeg -y -loglevel error -i "$HAM" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -preset slow \
  -movflags +faststart "animasyonlar/render/$AD.mp4"
ffmpeg -y -loglevel error -sseof -0.1 -i "animasyonlar/render/$AD.mp4" -frames:v 1 -update 1 "animasyonlar/render/$AD-kapak.png"
rm -rf "$GECICI"
SURE=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "animasyonlar/render/$AD.mp4")
echo "✔ animasyonlar/render/$AD.mp4 (${SURE%.*} sn)"
