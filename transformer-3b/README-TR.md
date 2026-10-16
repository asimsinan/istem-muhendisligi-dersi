# Transformer Explainer 3B · Türkçe

Brendan Bycroft'un [LLM Visualization](https://bbycroft.net/llm) projesinin ([kaynak](https://github.com/bbycroft/llm-viz), MIT) İstem Mühendisliği dersi için Türkçe uyarlaması. Yayın: `/transformer-3b/` (ders sitesi, `interaktif/public/transformer-3b/`). 2B sayfa (`/transformer/`, `transformer-tr/`) ile başlıktaki **2B | 3B** anahtarıyla geçilir.

## Özgünden farkları

| Konu | Uyarlama |
|---|---|
| Model | Özgün sahnede A/B/C sıralayan 85 bin parametrelik nano-gpt çalışıyordu (Odin → WASM, 16 MB bellek). Burada **Türkçe GPT-2 küçük** (`ytu-ce-cosmos/turkish-gpt2`, 124M) çalışır. İleri geçiş `src/llm/tr/TurkceModel.ts`'de düz JavaScript (8 bit ağırlık, satır başına ölçek); ara tensörler llm-viz'in doku düzenine (`GptModelWasm.ts` ile aynı) yazılır. Python başvurusuyla fark < 5e-6 (`scripts/referans.py`, `scripts/test_ileri.ts`). |
| Ağırlıklar | `scripts/agirlik_aktar.py` → `cikti/gpt2-tr-3b.bin` (124 MB) → 10 MiB'lık 12 parça `public/model/`. Sayfa parçaları önce Hugging Face'ten (`asy83/turkish-gpt2-explainer-onnx/model-3b`), olmazsa siteden ister; Cache API'de saklar. |
| Tokenizer | `src/llm/tr/bpe.ts` (2B Token Lab'deki bayt düzeyi BPE, Python ile birebir) + `coz()`; `public/tokenizer/tokenizer.json`. |
| Özet görünüm | Varsayılan sahne her 8. kanalı çizer (768 → 96 hücre, baş boyutu 64 → 8, MLP 3.072 → 384, sözlük ~190 grup). Seçim baş sınırlarıyla örtüşür (kanal j = gerçek kanal 8j), yani sahnedeki her hücre modeldeki gerçek bir sayıdır; ileri geçiş her zaman tam modelle yapılır (`tr/ayarlar.ts`: `KANAL_ADIMI`, `TurkceModel.ts`: `kanallar`, `secI8`). Böylece hücreler, oklar ve girdi/çıktı kutuları nano-gpt'deki gibi yakınlaşmadan okunur. Paneldeki **Gerçek boyut** düğmesi (`?boyut=gercek`) bütün hücreleri çizer. Anlatımdaki sayılar her iki görünümde de gerçek boyutlardır (`GERCEK`). |
| Odak modu ve durum kutusu | Özet görünümde sahnede tek Transformer bloğu ve yanında "× 12" notu (`tr/odak.ts`: `tekrarNotu`). **Odak** açıkken (varsayılan) her bölümde yalnızca o bölümün blokları net, diğerleri silik (`odakBloklari`, `odakUygula`); bölümün açılış kamerası bu blokları ekrana sığdırır (`odakKamerasi`). Sol alttaki **durum kutusu** (`tr/DurumKutusu.tsx`) bölümü tek cümleyle özetler ve sahnede küçük kalan gerçek sayıları büyük yazar: gömme toplamı, μ/σ, "o"nun dikkat dağılımı, artık yol, MLP etkinliği, her bloktan sonraki tahmin (logit merceği), logit → olasılık. |
| Kamera düğmeleri | Sol üstte yakınlaş/uzaklaş, döndür, yukarıdan/aşağıdan bak, sıfırla düğmeleri (basılı tutunca sürer) ve kısayol kartı (`tr/KameraKontrol.tsx`). Klavye: `+`/`−` (PageUp/PageDown) yakınlaş, `←`/`→` döndür, `↑`/`↓` eğ, W A S D kaydır, R sıfırla, `?` kısayollar. Yazı kutusundayken kısayollar çalışmaz (`utils/keyboard.ts`). |
| Sözlük ekseni | 50.257 sütunluk gömme ve çıktı matrisleri hem doku sınırını aşıyor hem sahnede 75.000 birimlik duvar oluyordu. Sözlük ekseni 25'li gruplarla (~2.000 hücre) çizilir: ağırlıkta her grubun ilk satırı, logit/olasılıkta grubun en büyüğü (`sozlukGrubu`, `GptModelLayout.ts`). |
| Anlatım | 10 bölümün tamamı Türkçe yeniden yazıldı; örnekler girdiden okunur (`tr/ornek.ts`): varsayılan cümle "Ali kitabı Ayşe'ye verdi çünkü o" (2B sayfa ve M2.3 videosuyla aynı), dikkat bölümünde son parça "o" sorgular. Kamera konumları nano için yazılmıştı; `tr/kamera.ts` her konumu nano yerleşimindeki bloktan GPT-2'deki aynı adlı bloğa oranlayarak taşır (nano'nun son bloğu → GPT-2'nin 12. bloğu). Softmax ve Çıktı bölümleri doğrudan çıktı bölgesine bakar (`setInitialCameraBlk`). |
| Arayüz | Türkçe başlık + 2B/3B anahtarı (`tr/Ust.tsx`), sağ altta cümle paneli (`tr/TurkcePanel.tsx`: çalıştır, tahmine tıklayıp ekle), bölüm/içindekiler/karşılama penceresi, 3B blok ve bölüm etiketleri Türkçe; yazı atlası Türkçe harflerle yeniden üretildi (`create-font-atlas.jsm`). Kırmızı-beyaz vurgu rengi, Inter yazı tipi. Telefonda indirme onay ister. |
| Hata düzeltmeleri | GPT-2 XL ve GPT-3 karşılaştırma modelleri kaldırıldı (`Program.ts`: `examples: []`); sahnede yalnızca Türkçe GPT-2 var. `Arrow.ts`, `BlockInfo.ts`, `ModelCard.ts`: ok, etiket ve girdi/çıktı kutusu boyları model ölçeğine (`margin / 12`) göre; oklar 12 bloğun hepsinde. `fontRender.ts`: etiket tamponu büyürken kapasite güncellenmiyordu (büyük modelde çöküyordu). `blockRender.ts`: yüzeye dik eksende `fwidth = 0` → 0/0 = NaN; bazı sürücülerde hücre renkleri tamamen griye dönüyordu (`izgara()`); değer renkleri daha uzaktan görünür. `Commentary.tsx`: anlatımda düz metin/sayı değerleri ve değerler arasındaki boşluk gösterilir. |

Kaldırılanlar: ana sayfa, CPU/kodek/akışkan projeleri, WASM model (`src/llm/wasm`), nano-gpt verisi.

## Anlatım (varsayılan sayfa, `src/hikaye/`)

`/transformer-3b/` artık sinematik, adım adım bir 3B anlatım açar; llm-viz sahnesi `/transformer-3b/ayrintili/` altında ("Ayrıntılı", ileri düzey) durur. Başlıktaki **Anlatım | Ayrıntılı** anahtarıyla geçilir.

- Kütüphaneler: React Three Fiber + drei (yazı, yuvarlak kutu, yay, kamera kontrolü), @react-three/postprocessing (ışıma, vinyet). Yazı tipi: Inter (latin + latin-ext birleştirilmiş, `public/fonts/hikaye/`).
- 10 adım (`akis.ts`): cümle → parçalar → gömme (token + konum = girdi) → normalizasyon → dikkat ("o"dan önceki parçalara yaylar; kalınlık = dikkat payı; blok/baş seçilebilir) → bilgi akışı (değer vektörleri yaylar boyunca akar, artık yola eklenir) → MLP (96 nöron yanar/söner) → 12 blok (logit merceği: her bloktan sonraki tahmin) → olasılıklar (logit → softmax çubukları) → seçim.
- Her adımda zamanlanmış altyazı, elle kurgulanmış kamera; oynat/duraklat, ileri/geri, hız (0,5–2×), otomatik ilerleme. Klavye: Boşluk, ← →, 1–9 ve 0 adıma atla, R kamera, + −.
- Sayılar tarayıcıdaki Türkçe GPT-2'nin gerçek ileri geçişinden (`veri.ts`); vektörlerden 16 eleman, MLP'den 96 nöron gösterilir. En fazla 14 parça.

## Ayrıntılı (`/transformer-3b/ayrintili/`, `src/ayrinti/`)

Seçili bloğun ve başın matris işlemleri, aynı sinematik dille (koyu sahne, ışıyan hücre ızgaraları), 12 adımda: girdi X → katman normu (μ, σ, N₁) → Q, K, V (N₁ · W, satır × sütun taraması) → puanlar Q·Kᵀ/√64 → nedensel maske (−∞) → satır satır softmax → A·V → 12 başın birleşimi · W_O + artık → MLP (W₁, GELU, W₂ + artık) → 12 bloğun çıktı levhaları (logit merceği) → çıktı katmanı h·Eᵀ (ağırlık paylaşımı) → sıcaklık kaydırıcılı softmax. Çarpımlarda C'nin hücreleri tek tek dolar; A'nın satırı ve B'nin sütunu parlar. Her hücrenin üstüne gelince gerçek değeri ve anlamı yazar. Blok/baş seçilebilir (varsayılan: araya en net bakan baş). Gösterilen: 768 kanaldan 24, baş boyutundan 12, MLP'den 36 nöron; hesap tam boyutta. Klavye: 1–9, 0, Q (11), W (12).

**Mimari haritası** (`src/hikaye/Mimari.tsx`, her iki görünümde solda): GPT-2'nin akış şeması (gömme → blok ×12 [norm, çok başlı dikkat: Q/K/V, QKᵀ, maske, softmax, A·V, W_O; artık; norm; MLP; artık] → son norm → çıktı → softmax); o anki adımın katmanları kırmızı ışır, izlenen blok ve baş yazar, kutuya tıklayınca o adıma gidilir (M ile aç/kapa). Çizim llm-viz'in içindekiler şemasına benzer SVG'dir: üstte girdi parçaları ve sağ üstte "sonraki parça" tahmin kutusu; "Dil modeli" kesikli çerçevesinde token gömme ⊕ konum gömme (~), arkasında iki kopya gölgesiyle "× 12" transformer bloğu (katman normu → Q/K/V okları → çok başlı nedensel öz dikkat [ayrıntılıda 6 alt adım çipi, anlatımda 2] ⊕ sağdan artık bağlantı → katman normu → MLP ⊕ artık), sonra katman normu → doğrusal → softmax ve sağdan tahmin kutusuna dönen yeşil çıktı hattı. **Tam ekran**: oynatıcıdaki düğme ya da F (Safari için webkit önekli API).

**Bilgi kartları ve sözlük** (`src/hikaye/kartlar.ts`, `src/hikaye/Kart.tsx`): her adımın başında animasyon durur ve kitap biçimli bir kart açılır. Sol sayfada rehber robot ASY (bileşen adı `Gezgin`; bu proje için çizilmiş özgün SVG karakter; yeşil/pembe gövde hücreleri sahnedeki vektör renkleri) adımı bir benzetmeyle anlatır; sağ sayfada oyuncak sayılarla tek bir örnek hesap (nokta çarpım, softmax, GELU, katman normu…), "Ekranda" notu (gerçek değerlerle) ve terimlerin tanımları var. Her adımın kartı oturumda bir kez kendiliğinden açılır; oynatıcıdaki kitap düğmesi ya da K ile yeniden açılır; Enter/Boşluk/→ animasyonu başlatır; "Kartları gösterme" seçimi tarayıcıda saklanır (`gezgin-kartlar`). Altyazılarda sözlükteki terimlerin altı noktalı çizilir, üstüne gelince tanım açılır (her iki görünümde). 3B sahne kendi yığın bağlamında (`.sahneKap`), sahnedeki HTML etiketleri kartın üstüne çıkmaz.

Eski llm-viz ("klasik") görünümü 07.10.2026'da siteden kaldırıldı; `/transformer-3b/klasik/` adresi Anlatım görünümüne yönlendirilir (`interaktif/vercel.json`). Model yükleyici ve Türkçe araçlar (`src/llm/tr/`) Anlatım ve Ayrıntılı görünümde kullanılmaya devam ediyor.

Yazı tipi: Inter (latin, latin-ext, Yunanca) + DejaVu Sans'tan matematik işaretleri (√ ∞ → ₁ ᵀ …) `public/fonts/hikaye/` içinde birleştirildi (fontTools).

**Anlatım düzeyleri** (`src/hikaye/duzeyler.ts`, iki görünümde): altyazının üstünde Hikaye · Öğrenci · Mühendis seçimi (D tuşu). Öğrenci = `akis.ts` / `ayrinti/akis.ts` altyazıları; Hikaye = aynı zamanlamayla benzetmeli, terimsiz vuruşlar; Mühendis = Öğrenci altyazısı + altta formül ve boyutlar (ör. `S = Q·Kᵀ / √64   (8 × 64) · (64 × 8) = 8 × 8`). Anlatım Hikaye, Ayrıntılı Mühendis ile açılır; seçim görünüm başına saklanır (`gezgin-duzey-anlatim`, `gezgin-duzey-ayrinti`).

**Önce tahmin et** (`src/hikaye/sorular.ts`, `Soru.tsx`): bazı adımlardan önce (anlatım: Dikkat, Olasılıklar; ayrıntılı: Softmax, Çıktı katmanı) animasyon durur ve öğrenciye modelin ne yapacağı sorulur (en çok hangi parçaya bakacak, sıradaki parça ne olacak). Seçenekler 1–9 tuşlarıyla da seçilir, Esc atlar. Cevaptan sonra altyazının üstünde sonuç kalır: tahminin ve modelin gerçek değeri (seçili blok/baş, gerçek olasılık). Doğru cevap her zaman modelin o anki çıktısıdır. Sorular cümle değişince sıfırlanır; "Tahmin soruları" kutusuyla kapatılır (`gezgin-sorular`).

**Ayrıntılı görünümde ASY**: 12 adımın her biri için bilgi kartı (`kartlar.ts` → `ayrintiKartlari`): matris çarpımı, Q·Kᵀ, maske, satır softmax'ı, A·V, başların birleşmesi, GELU, ağırlık paylaşımı ve sıcaklık için oyuncak matrislerle örnek hesaplar. Akış: kart → (varsa) soru → animasyon.

## İngilizce sürüm (`/transformer-3b/en/`)

Aynı kod iki kez derlenir: `NEXT_PUBLIC_DIL=en NEXT_PUBLIC_TABAN=/transformer-3b/en`. Dil derleme anında sabit (`src/llm/tr/dil.ts`: `EN`, `L(tr, en)`, `YEREL`); her yazı yanında İngilizcesiyle durur (adımlar, altyazılar, bilgi kartları ve sözlük `kartlar.ts`'te `kartlarEN`/`SOZLUK_EN`, mimari haritası, 3B etiketler, sayı biçimi 12.3% / %12,3). İngilizce sürüm özgün OpenAI GPT-2'yi çalıştırır (örnek cümle "Alice gave the book to Mary because she"). Başlıkta TR | EN geçişi aynı görünümün öteki diline gider; 2B bağlantısı da dile göre (`/transformer/` ya da `/transformer/en/`).

- Model: `python scripts/agirlik_aktar.py openai-community/gpt2 gpt2-en-3b --wte16` → `cikti/gpt2-en-3b.bin` (163 MB) → `dil-en/model/` içine 16 parça (10 MiB). Gömme tablosu fp16: satır başına 8 bit, GPT-2'nin aşırı büyük birkaç kanalı yüzünden olasılıkları kaydırıyordu (" was" %18,6 → %11). Yükleyici fp16 gömmeyi aynı alanlara ölçek 1 ile koyar (`agirliklariAc`). Sonuç Hugging Face ile aynı: was %18,6 · wanted %15,1 · had %9,9.
- Tokenizer: `dil-en/tokenizer/tokenizer.json` (openai-community/gpt2).
- Hugging Face: `model-3b-en/` (yükleme: `bash transformer-tr/scripts-tr/hf_yukle.sh en`); bulunamazsa sitedeki kopya (`/transformer-3b/en/model/`, depoya eklenmez).
- Derleme ve kurulum (iki dil birden): `bash scripts/derle.sh`.

## Üretmek

```bash
# Python (torch, transformers, tokenizers) — ağırlık dosyası
python scripts/agirlik_aktar.py                 # → cikti/gpt2-tr-3b.bin
mkdir -p public/model && cd public/model && split -b 10485760 -d -a 2 ../../cikti/gpt2-tr-3b.bin gpt2-tr-3b.bin.part && cd ../..
#   (parça adlarındaki baştaki sıfırları kaldırın: part00 → part0); sayı değişirse TurkceModel.ts PARCA_SAYISI
python scripts/referans.py "Türkiye'nin başkenti" 24 hf   # NumPy başvurusu + HF ile karşılaştırma
npx tsx scripts/test_ileri.ts                              # JS ileri geçişi (sonra referansla karşılaştırın)

# Yazı atlası (Türkçe harfler eklendiyse)
node create-font-atlas.jsm

# Site
npm ci   # ya da: yarn
npx next build                                  # → out/  (basePath /transformer-3b)
rm -rf ../interaktif/public/transformer-3b && cp -r out ../interaktif/public/transformer-3b
```

`interaktif/public/transformer-3b/model/` depoya eklenmez (`interaktif/.gitignore`); parçalar Hugging Face'e `bash transformer-tr/scripts-tr/hf_yukle.sh 3b` ile yüklenir. `interaktif/vercel.json`'da `/transformer-3b` için yeniden yazma kuralı vardır.

## Atıf ve lisans

- LLM Visualization: Brendan Bycroft, MIT lisansı (`LICENSE`). Yazı tipleri ve diğer üçüncü taraf varlıklar kendi lisanslarıyla.
- Türkçe GPT-2: YTÜ COSMOS, MIT lisansı.
- Uyarlama: SDÜ Bilgisayar Mühendisliği, İstem Mühendisliği dersi.
