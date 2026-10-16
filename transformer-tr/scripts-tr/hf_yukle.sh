#!/bin/bash
# Model parçalarını Hugging Face'e yükler: https://huggingface.co/asy83/turkish-gpt2-explainer-onnx
# Sayfa (interaktif/public/transformer) parçaları önce oradan ister; yoksa sitedeki kopyaya düşer.
#
# Bir kez:   pip install -U huggingface_hub     (ya da: brew install huggingface-cli)
#            hf auth login                       (Write yetkili bir token yapıştırın)
# Sonra repo kökünden:   bash transformer-tr/scripts-tr/hf_yukle.sh          (hepsi)
#                    ya da: bash transformer-tr/scripts-tr/hf_yukle.sh gemma    (yalnızca Gemma + model kartı)
#                    ya da: bash transformer-tr/scripts-tr/hf_yukle.sh 3b       (yalnızca 3B görünüm ağırlıkları + model kartı)
#                    ya da: bash transformer-tr/scripts-tr/hf_yukle.sh en       (yalnızca İngilizce sürümün modelleri: 2B model-en + 3B model-3b-en)
set -e
DEPO=asy83/turkish-gpt2-explainer-onnx
cd "$(dirname "$0")/../.."
# Önce .gitattributes: ".onnx.partN" parçaları ikili dosya olarak (Xet/LFS) saklansın, yoksa Hub reddeder
hf upload "$DEPO" transformer-tr/hf/.gitattributes .gitattributes --commit-message "Parçalar ikili dosya (Xet)"
hf upload "$DEPO" transformer-tr/hf/README.md README.md --commit-message "Model kartı"
hf upload "$DEPO" transformer-tr/hf/LICENSE.md LICENSE.md --commit-message "Lisanslar (MIT + Gemma Kullanım Koşulları)"
if [ "$1" = "3b" ]; then
  hf upload "$DEPO" interaktif/public/transformer-3b/model model-3b --commit-message "3B görünüm: Türkçe GPT-2 küçük, 8 bit, 12 parça"
  echo "Bitti: https://huggingface.co/$DEPO"; exit 0
fi
if [ "$1" = "en" ]; then
  hf upload "$DEPO" interaktif/public/transformer/model-en model-en --commit-message "İngilizce 2B: OpenAI GPT-2 küçük, MatMulNBits 8 bit, 22 parça"
  hf upload "$DEPO" interaktif/public/transformer-3b/en/model model-3b-en --commit-message "İngilizce 3B: OpenAI GPT-2 küçük, 8 bit + fp16 gömme, 16 parça"
  echo "Bitti: https://huggingface.co/$DEPO"; exit 0
fi
if [ "$1" = "gemma" ]; then
  hf upload "$DEPO" interaktif/public/transformer/model-gemma model-gemma --commit-message "Gemma 3 270M (sözlük 49 bin, 8 bit), 21 parça + NOTICE"
  echo "Bitti: https://huggingface.co/$DEPO"; exit 0
fi
hf upload "$DEPO" interaktif/public/transformer/model-tr model-tr --commit-message "Küçük model (turkish-gpt2), 20 parça"
hf upload "$DEPO" interaktif/public/transformer/model-tr-orta model-tr-orta --commit-message "Orta model (turkish-gpt2-medium), 45 parça"
hf upload "$DEPO" interaktif/public/transformer/model-xglm model-xglm --commit-message "Çok dilli model (XGLM 564M, sözlük 40 bin, 8 bit), 46 parça"
hf upload "$DEPO" interaktif/public/transformer/model-gemma model-gemma --commit-message "Gemma 3 270M (sözlük 49 bin, 8 bit), 21 parça + NOTICE"
hf upload "$DEPO" interaktif/public/transformer-3b/model model-3b --commit-message "3B görünüm: Türkçe GPT-2 küçük, 8 bit, 12 parça"
hf upload "$DEPO" interaktif/public/transformer/model-en model-en --commit-message "İngilizce 2B: OpenAI GPT-2 küçük, MatMulNBits 8 bit, 22 parça"
hf upload "$DEPO" interaktif/public/transformer-3b/en/model model-3b-en --commit-message "İngilizce 3B: OpenAI GPT-2 küçük, 8 bit + fp16 gömme, 16 parça"
echo "Bitti: https://huggingface.co/$DEPO"
