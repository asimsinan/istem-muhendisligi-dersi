---
license: other
license_name: mit-and-gemma-terms
license_link: LICENSE.md
language:
- tr
- en
base_model:
- ytu-ce-cosmos/turkish-gpt2
- ytu-ce-cosmos/turkish-gpt2-medium
- facebook/xglm-564M
- google/gemma-3-270m
- openai-community/gpt2
tags:
- onnx
- gpt2
- gemma3
- turkish
- transformer-explainer
- education
---

# Türkçe GPT-2 · Transformer Explainer için ONNX

Bu depo, **İstem Mühendisliği** dersinde kullanılan Türkçe [Transformer Explainer](https://istem-muhendisligi-dersi.vercel.app/transformer/) sayfasının tarayıcıda çalıştırdığı model dosyalarını barındırır.

| Klasör | Kaynak model | Yapı | Boyut |
|---|---|---|---|
| `model-tr/` | [ytu-ce-cosmos/turkish-gpt2](https://huggingface.co/ytu-ce-cosmos/turkish-gpt2) | 124M · 12 blok · 12 baş · 768 | 210 MB, 20 parça |
| `model-tr-orta/` | [ytu-ce-cosmos/turkish-gpt2-medium](https://huggingface.co/ytu-ce-cosmos/turkish-gpt2-medium) | 355M · 24 blok · 16 baş · 1024 | 470 MB, 45 parça |
| `model-xglm/` | [facebook/xglm-564M](https://huggingface.co/facebook/xglm-564M) (30 dil) | 24 blok · 16 baş · 1024 · sözlük 40 bin | 478 MB, 46 parça |
| `model-gemma/` | [google/gemma-3-270m](https://huggingface.co/google/gemma-3-270m) | 18 blok · 4 sorgu başı + 1 K/V başı · 640 · sözlük 49 bin | 211 MB, 21 parça |
| `model-3b/` | [ytu-ce-cosmos/turkish-gpt2](https://huggingface.co/ytu-ce-cosmos/turkish-gpt2) | 3B görünüm (llm-viz uyarlaması) için tek ikili dosya: satır başına 8 bit ağırlık + ölçekler, JSON başlıklı | 124 MB, 12 parça |
| `model-en/` | [openai-community/gpt2](https://huggingface.co/openai-community/gpt2) | İngilizce 2B sayfa (/transformer/en/): yalnız-ağırlık 8 bit (MatMulNBits, blok 32), gömme fp16 | 224 MB, 22 parça |
| `model-3b-en/` | [openai-community/gpt2](https://huggingface.co/openai-community/gpt2) | İngilizce 3B görünüm (/transformer-3b/en/): `model-3b` biçimi, gömme tablosu fp16 | 163 MB, 16 parça |

## Nasıl üretildi?

- Ağırlıklar [Polo Club Transformer Explainer](https://github.com/poloclub/transformer-explainer) koduna (nanoGPT tabanlı) aktarıldı ve ONNX'e dışa aktarıldı (opset 14). Model, sıradaki token logit'lerine (`linear_output`) ek olarak **her blok ve her dikkat başı için** dikkat tablolarını (`block_{i}_attn_head_{j}_attn`, `_attn_scaled`, `_attn_masked`, `_attn_softmax`, `_attn_dropout`) çıktı olarak verir; görselleştirme bunlardan çizilir.
- XGLM, GPT-2 yapısına bire bir aktarıldı (q/k/v birleştirildi, gömme √d ile ölçeklendi, sinüs konum tablosu wpe'ye yazıldı, çıktı katmanı ayrı). Sözlüğü Türkçe ve İngilizce Vikipedi örneklerinde kullanılan 40 bin parçaya indirildi (kapsama %99,4); budanmış tokenizer sitede durur. Ağırlıklar yalnız-ağırlık 8 bit (MatMulNBits, blok 32): dinamik int8 bu modelde tahminleri bozuyordu.
- Gemma 3 GPT-2 yapısına aktarılamaz (RoPE, GQA, RMSNorm, GeGLU, Q/K normu); bu yüzden aynı çıktıları veren ayrı bir PyTorch tanımıyla (`gemma.py`) dışa aktarıldı. Hugging Face uygulamasıyla logit farkı < 1e-5. Sözlük Türkçe ve İngilizce Vikipedi örneklerinde kullanılan ~49 bin parçaya indirildi (BPE birleştirmelerinin ataları korunarak); başa `<bos>` eklenir. Ağırlıklar yalnız-ağırlık 8 bit (MatMulNBits, blok 32), gömme fp16.
- `model-en/`: OpenAI GPT-2'de dinamik int8 (etkinleştirmeler de nicemlenir) tahminleri bozuyordu ("Alice gave the book to Mary because she" → " was" yerine "'s"); bu yüzden XGLM ve Gemma gibi yalnız-ağırlık 8 bit. `model-3b-en/`: satır başına 8 bit gömme tablosu GPT-2'nin aşırı büyük birkaç kanalı yüzünden olasılıkları kaydırıyordu (" was" %18,6 → %11); gömme fp16 saklandı, sonuç Hugging Face ile aynı.
- `model-3b/`: ONNX değil; [3B görünüm](https://istem-muhendisligi-dersi.vercel.app/transformer-3b/) ileri geçişi JavaScript'te kendisi yaptığı için ağırlıklar düz bir ikili dosyada (`gpt2-tr-3b.bin`): 4 bayt başlık uzunluğu + JSON başlık (tensör adı, şekil, ofset) + veri. Doğrusal katmanlar (çıktı, girdi) düzeninde, satır başına simetrik 8 bit; LayerNorm, sapma ve konum gömmesi fp16. Üretim: `transformer-3b/scripts/agirlik_aktar.py`.
- Tarayıcı için küçültme (Türkçe GPT-2): blok ve çıktı katmanı MatMul ağırlıkları kanal başına int8 (dinamik nicemleme), token gömme tablosu fp16. En olası token'lar özgün modelle aynı kalır.
- Dosyalar, tarayıcıda paralel indirme ve önbellek için 10 MB'lık parçalara bölündü (`*.onnx.part0` …). Birleştirmek için parçaları sırayla uç uca ekleyin.

Bu dosyalar genel amaçlı metin üretimi için değil, eğitimde modelin içini göstermek içindir. Asıl modeller için yukarıdaki YTÜ Cosmos sayfalarına bakın.

## Atıf ve lisans

- Türkçe GPT-2 modelleri: YTÜ COSMOS Araştırma Grubu, MIT lisansı.
- XGLM: Lin vd. (Meta AI, 2022), MIT lisansı.
- GPT-2 (`model-en/`, `model-3b-en/`): Radford vd., “Language Models are Unsupervised Multitask Learners” (OpenAI, 2019), openai-community/gpt2, MIT lisansı.
- **Gemma 3 (`model-gemma/`)**: Gemma Team, Google DeepMind (2025). Gemma is provided under and subject to the Gemma Terms of Use found at [ai.google.dev/gemma/terms](https://ai.google.dev/gemma/terms). Bu klasördeki dosyalar Gemma'nın değiştirilmiş bir sürümüdür (sözlük budandı, 8 bit nicemlendi, ONNX'e aktarıldı) ve [Gemma Kullanım Koşulları](https://ai.google.dev/gemma/terms) ile [Yasaklı Kullanım Politikası](https://ai.google.dev/gemma/prohibited_use_policy)'na tabidir; bu dosyaları kullanan ya da yeniden dağıtan herkes bu koşulları kabul etmiş sayılır. Ayrıntı: `model-gemma/NOTICE`.
- Transformer Explainer: Aeree Cho, Grace C. Kim, Alexander Karpekov, Seongmin Lee, Alec Helbling, Benjamin Hoover, Zijie J. Wang, Minsuk Kahng, Duen Horng Chau (Georgia Tech), MIT lisansı. [Makale](https://arxiv.org/abs/2408.04619)
- Bu dönüştürme: SDÜ Bilgisayar Mühendisliği, İstem Mühendisliği dersi. MIT lisansı (`model-gemma/` hariç; o klasör Gemma Kullanım Koşulları'na tabidir).
