# Transformer Explainer · Türkçe uyarlama

Bu klasör, Polo Club'ın [Transformer Explainer](https://github.com/poloclub/transformer-explainer) aracının (MIT) İstem Mühendisliği dersi için Türkçe uyarlamasıdır.
Özgün README: `README.md` · Lisans: `LICENSE` (değiştirilmedi).

## Ne değişti?

| Konu | Değişiklik |
|------|-----------|
| Model | `ytu-ce-cosmos/turkish-gpt2` (YTÜ Cosmos, MIT). Yapısı GPT-2 small ile aynı (12 blok, 12 baş, 768 boyut, 50.257 token). |
| Model dosyası | `src/utils/model/export_to_onnx.py` ile ONNX'e aktarıldı; blok ve çıktı katmanı ağırlıkları kanal başına int8, token gömme fp16 → 210 MB (özgün 600 MB). 20 parça: `static/model-tr/`. |
| Tokenizer | Siteden yüklenir: `static/tokenizer/turkish-gpt2/` (Hugging Face'e bağımlılık yok). |
| Örnekler | 5 Türkçe hazır örnek: `scripts-tr/ornekleri_uret.py` → `src/constants/examples/ex0..4.js`. Telefonda bunlar gösterilir. |
| Arayüz | `scripts-tr/arayuz_cevir.py` (etiketler, yardım balonları) ve `scripts-tr/sayfalar_tr.json` (20 rehber kartı). Uzun İngilizce makale yerine `src/components/tr/Hakkinda.svelte`. |
| Gizlilik | Google Tag Manager kaldırıldı; site veri toplamaz. |
| Üret düzeltmesi | Özgün kodda model, abonelik içinde bir önceki metinle çalışabiliyordu; tahmin yeni metne eklenince "Ankara'd'd" gibi tekrarlar oluşuyordu. Model inerken örnek değiştirilse de ilk örnek kalıyor, sıcaklık eski logit'lerden örnekliyordu. Abonelik geri çağrılarında store değerleri artık `get()` ile o anda okunuyor (`+page.svelte`); kutuya odaklanınca eklenen tahmin, sıcaklık/örnekleme değişince geri alınıyor (`InputForm.svelte`). |
| Model durumu | Yazı kutusunun altında görünür gösterge: “Model iniyor · %N” (ilerleme çubuğu), “Model hazırlanıyor…”, “✓ Model hazır”, “Model inmedi” (hata); telefonda “Telefonda yalnızca örnekler”. |
| Orta model | İsteğe bağlı `ytu-ce-cosmos/turkish-gpt2-medium` (355M; 24 blok, 16 baş, 1024 boyut): yazı kutusunun altındaki “Orta modele geç” düğmesiyle iner (470 MB, 45 parça, `static/model-tr-orta/`). Küçük model açık kalır; iki oturum bellekte tutulur, geçişte blok/baş seçimi başa döner. Çıktı adları modele göre üretilir (`dikkatTensorleri`). |
| Model barındırma | Parçalar önce Hugging Face'ten istenir (`asy83/turkish-gpt2-explainer-onnx`, `src/utils/fetchChunks.js` → `HF_MODEL_DEPOSU`); erişilemezse sitedeki kopyaya düşülür. Yükleme: `bash transformer-tr/scripts-tr/hf_yukle.sh` (model kartı `hf/README.md`). Orta model GitHub'a eklenmez (`.gitignore`); yalnızca Hugging Face'ten iner. |
| Çok dilli model | `facebook/xglm-564M` (30 dil): `GPT.from_xglm` (model.py) ile GPT-2 yapısına bire bir aktarılır; sözlük `scripts-tr/xglm_sozluk.py` ile 40 bine indirilir (budanmış tokenizer `static/tokenizer/xglm-tr/`); yalnız-ağırlık 8 bit nicemleme `scripts-tr/nicemle_nbits.py` (dinamik int8 bu modelde bozuyordu, 4 bit de). 478 MB, 46 parça (`static/model-xglm/`). Sayfada SentencePiece token'larının baştaki boşluğu korunsun diye tokenizer sarmalanır (`metaspaceSarmala`). |
| Gemma 3 | `google/gemma-3-270m` (mirror: `unsloth/gemma-3-270m`): GPT-2 yapısına aktarılamadığı için ayrı tanım `src/utils/model/gemma.py` (RoPE, GQA 4 Q/1 KV, Q/K RMSNorm, ön+arka RMSNorm, GeGLU; kayan pencere kısa girdilerde etkisiz). Çıktı adları GPT ile aynı; HF ile logit farkı < 1e-5. Sözlük `scripts-tr/gemma_sozluk.py` ile ~49 bine (BPE ataları korunur; transformers.js için eklenmiş parçalar uzundan kısaya sıralı, `\n\n` doğru eşleşsin diye). 8 bit `nicemle_nbits.py` (gömme otomatik bulunur). 211 MB, 21 parça (`static/model-gemma/` + `NOTICE`). Lisans: Gemma Kullanım Koşulları (`hf/LICENSE.md`, Hakkında). Arayüz: `modelMetaMap.gemma` (`head_dim`, `kv_head_num`, `mlp_dim`, `mimari`, `sozluk`) ve yardımcılar `basBoyutu`, `mlpBoyutu`, `qkvBoyutu`, `gemmaMi`; gömmede konum sütunu RoPE yer tutucusu, K/V “ortak” rozeti, MLP “kapılı · GeGLU”, ağırlık kutularında kırmızı Gemma notları, rehber kartlarında Gemma paragrafları. |
| Derleme | Vite 6'ya yükseltildi (Svelte eklentisi uyumu), Sass yükleme yolu ve büyük/küçük harf duyarlı içe aktarma (`Popovers/`) düzeltildi. `base` yolu: `/transformer`. |

## İngilizce sürüm (`/transformer/en/`)

Aynı kaynak `VITE_DIL=en` ile ikinci kez derlenir; özgün OpenAI GPT-2 (küçük) çalışır, yalnızca bu model vardır.

- **Çeviri:** arayüz yazıları kaynakta Türkçe kalır. `vite.config.ts`'teki `ceviri-en` eklentisi İngilizce derlemede `src/dil/en.json`'daki [Türkçe, İngilizce] çiftlerini dosya dosya değiştirir; bir çift bulunamazsa (kaynak değişmişse) derleme hata verir. Ders kitabı sayfaları `src/dil/sayfalar_en.json`'dan, "Hakkında" bölümü `components/tr/HakkindaEN.svelte`'den. Mantık farkları (model, örnekler, önbellek, sayı biçimi) `src/dil/dil.ts`'teki `EN` sabitiyle. Eksik çeviri denetimi: `python scripts-tr/ceviri_denetle.py`.
- **Model:** `python src/utils/model/export_to_onnx.py openai-community/gpt2 gpt2-en` → `python scripts-tr/nicemle_nbits.py gpt2-en 8` → `split -b 10485760 -d -a 2 params_output/gpt2-en-n8.onnx static/model-en/gpt2-en.onnx.part` (baştaki sıfırları kaldırın; 22 parça, 224 MB). Dinamik int8 (`nicemle.py`) OpenAI GPT-2'de tahminleri bozuyordu ("…because she" → " was" yerine "'s"); yalnız-ağırlık 8 bit Hugging Face ile aynı ilk tahminleri veriyor.
- **Tokenizer:** `static/tokenizer/gpt2-en/` (openai-community/gpt2). **Hazır örnekler:** `python scripts-tr/ornekleri_uret.py en` → `src/constants/examples-en/` (`$ornekler` takma adı dile göre seçer).
- **Önbellek:** iki dilin model önbelleği ayrı (`onnx-model-cache-tr-v1`, `-en-v1`) ve ikisi de korunur.
- **Barındırma:** Hugging Face `model-en/` (`bash transformer-tr/scripts-tr/hf_yukle.sh en`); bulunamazsa `/transformer/model-en/` (depoya eklenmez).
- **Derleme:** `bash scripts-tr/derle_en.sh` (İngilizce, `/transformer/en/` olarak kurar), sonra Türkçe derleme her zamanki gibi.

## Yeniden üretmek

```bash
# 1) Model (Python: torch, transformers, onnx, onnxruntime)
python src/utils/model/export_to_onnx.py           # → params_output/gpt2-tr.onnx (fp32)
python scripts-tr/nicemle.py                       # → params_output/gpt2-tr-final.onnx (210 MB)
split -b 10485760 -d -a 2 params_output/gpt2-tr-final.onnx static/model-tr/gpt2-tr.onnx.part   # sonra parça adlarındaki baştaki sıfırları kaldırın
python scripts-tr/ornekleri_uret.py
# Orta model (8 GB bellekte ~6 GB swap gerekebilir)
python src/utils/model/export_to_onnx.py ytu-ce-cosmos/turkish-gpt2-medium gpt2-tr-orta
python scripts-tr/nicemle.py gpt2-tr-orta          # → params_output/gpt2-tr-orta-final.onnx (470 MB)
split -b 10485760 -d -a 2 params_output/gpt2-tr-orta-final.onnx static/model-tr-orta/gpt2-tr-orta.onnx.part   # baştaki sıfırları kaldırın
# Çok dilli XGLM
python scripts-tr/xglm_sozluk.py                    # Vikipedi tr/en örnekleri → 40 bin parçalık sözlük
python src/utils/model/export_to_onnx.py facebook/xglm-564M gpt2-tr-xglm
python scripts-tr/nicemle_nbits.py gpt2-tr-xglm 8   # → params_output/gpt2-tr-xglm-n8.onnx (478 MB)
split -b 10485760 -d -a 2 params_output/gpt2-tr-xglm-n8.onnx static/model-xglm/gpt2-tr-xglm.onnx.part
cp params_output/xglm/tokenizer.json static/tokenizer/xglm-tr/
# Gemma 3 270M (ağırlıklar ~/.cache/huggingface; `unsloth/gemma-3-270m` erişim onayı istemez)
python scripts-tr/gemma_sozluk.py                   # → params_output/gemma/{tokenizer.json, tokenizer_config.json, eski_idler.json}
python src/utils/model/export_to_onnx.py unsloth/gemma-3-270m gpt2-tr-gemma
python scripts-tr/nicemle_nbits.py gpt2-tr-gemma 8  # → params_output/gpt2-tr-gemma-n8.onnx (211 MB)
split -b 10485760 -d -a 2 params_output/gpt2-tr-gemma-n8.onnx static/model-gemma/gpt2-tr-gemma.onnx.part   # baştaki sıfırları kaldırın; NOTICE dosyası klasörde kalsın
cp params_output/gemma/tokenizer*.json static/tokenizer/gemma-tr/
# 2) Site
npm ci --legacy-peer-deps && npm run build
rm -rf ../interaktif/public/transformer && cp -r build ../interaktif/public/transformer
rm -rf ../interaktif/public/transformer/article_assets ../interaktif/public/transformer/preview   # kullanılmıyor
```
Model parçaları (`static/model-tr/`) depoya ikinci kez eklenmez (`.gitignore`). Modeli yeniden üretmeden yalnızca arayüzü derlemek için önce yayındaki kopyayı alın:

```bash
cp -r ../interaktif/public/transformer/model-tr ../interaktif/public/transformer/model-tr-orta ../interaktif/public/transformer/model-xglm ../interaktif/public/transformer/model-gemma static/
```
Parça sayısı değişirse `src/routes/+page.svelte` (`chunkNum`) ve `src/store/index.ts` (`chunkTotal`) güncellenir.
