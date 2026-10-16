"""Arayüz yazılarını Türkçeye çevirir (bir kez çalıştırılır; tekrar çalıştırmak zararsızdır)."""
import re, glob
D = "src/components/"

# 1) Metin düğümleri: >  EN  <  (yalnız tam eşleşme)
DUGUM = {
  "Attention.svelte": {"Multi-head Self Attention": "Çok Başlı Öz Dikkat", "Key": "Anahtar", "Query": "Sorgu", "Value": "Değer", "Out": "Çıktı"},
  "AttentionMatrix.svelte": {"Dot product": "Nokta çarpım", "Scaling · Mask": "Ölçekleme · Maske", "Attention": "Dikkat"},
  "Embedding.svelte": {"Embedding": "Gömme", "Tokenization": "Tokenizasyon", "Positional": "Konum", "Encoding": "Kodlaması", "position": "konum"},
  "InputForm.svelte": {"Examples": "Örnekler", "Generate": "Üret"},
  "LinearSoftmax.svelte": {"Probabilities": "Olasılıklar", "Tokens": "Token'lar", "Logits": "Logit'ler", "Scaled logits": "Ölçekli logit'ler", "sum=": "toplam="},
  "Operation.svelte": {"Layer Normalization": "Katman Normalizasyonu", "Residual": "Artık"},
  "Sampling.svelte": {"Sampling": "Örnekleme"},
  "Temperature.svelte": {"Temperature": "Sıcaklık"},
  "SubsequentBlocks.svelte": {"more identical": "özdeş"},
  "Popovers/ActivationPopover.svelte": {"Applies non-linear transformation to linearly transformed output to learn complex patterns.": "Karmaşık örüntüleri öğrenmek için doğrusal dönüşümün çıktısına doğrusal olmayan bir dönüşüm uygular."},
  "Popovers/AttentionWeightPopover.svelte": {"Attention": "Dikkat", "Value": "Değer", "Out": "Çıktı"},
  "Popovers/CommonPopover.svelte": {"Read more": "Devamı"},
  "Popovers/DropoutPopover.svelte": {"Disables randomly selected neurons. Used only during training.": "Rastgele seçilen nöronları kapatır. Yalnızca eğitimde kullanılır."},
  "Popovers/LayerNormPopover.svelte": {"Normalizes layer input to have a standard distribution for stability.": "Kararlılık için katman girdisini standart bir dağılıma getirir."},
  "Popovers/LogitWeightPopover.svelte": {"Output": "Çıktı", "Embedding": "Gömme", "Output Projection Weights": "Çıktı izdüşüm ağırlıkları", "Output Projection Bias": "Çıktı izdüşüm sapması", "Logits": "Logit'ler"},
  "Popovers/MLPDownWeightPopover.svelte": {"Expanded Embeddings": "Genişletilmiş gömmeler", "Compression Weights": "Sıkıştırma ağırlıkları", "Compression Bias": "Sıkıştırma sapması", "Compressed": "Sıkıştırılmış", "Embeddings": "gömmeler"},
  "Popovers/MLPWeightPopover.svelte": {"Embeddings": "Gömmeler", "Expansion Weights": "Genişletme ağırlıkları", "Expansion Bias": "Genişletme sapması", "Expanded": "Genişletilmiş"},
  "Popovers/PositionalEncodingPopover.svelte": {"Positional Encoding": "Konum kodlaması", "Position": "Konum", "Embedding": "Gömme", "Encoding Matrix": "Kodlama matrisi"},
  "Popovers/QKVWeightPopover.svelte": {"Embeddings": "Gömmeler", "Q·K·V Weights": "Q·K·V ağırlıkları", "Q·K·V Bias": "Q·K·V sapması"},
  "Popovers/ResidualPopover.svelte": {"Adds layer input to output to help preserve information.": "Bilginin korunmasına yardım etmek için katmanın girdisini çıktısına ekler."},
  "Popovers/SoftmaxPopover.svelte": {"Scaled logit": "Ölçekli logit", "temperature": "sıcaklık", "Otherwise": "Aksi hâlde", "Normalization": "Normalizasyon"},
  "common/HelpPopover.svelte": {"Open Textbook": "Ders kitabını aç (İngilizce)", "Read more": "Devamı"},
}
# 2) Düz metin değişimleri (benzersiz parçalar; yardım balonları, mesajlar, nitelikler)
DUZ = {
  "Embedding.svelte": [
    ("Converts tokens into numerical \\nrepresentations using embeddings \\nderived from predefined vocabulary, \\ncapturing their semantic meaning.",
     "Token'ları, önceden belirlenmiş sözlükten \\ngelen gömmelerle sayısal temsillere \\nçevirir ve anlamlarını yakalar."),
    ("Converts token positions into \\nnumerical representations that \\ncapture their order in the sequence.",
     "Token konumlarını, dizideki sıralarını \\nyakalayan sayısal temsillere çevirir."),
  ],
  "InputForm.svelte": [
    ("Try the examples. Please use a desktop computer to input GPT-2 prompts directly.", "Örnekleri deneyin. Kendi cümlenizi yazmak için bilgisayardan açın."),
    ("Try the examples while GPT-2 model is being downloaded (600MB)", "Model indirilirken örnekleri deneyin (210 MB, yalnızca ilk açılışta)"),
    ("You can enter up to {wordLimit} words.", "En fazla {wordLimit} kelime yazabilirsiniz."),
    ('placeholder="Test your own input text"', 'placeholder="Kendi cümlenizi yazın"'),
  ],
  "Sampling.svelte": [("Changes how next \\ntoken is selected from \\nprobability distribution.", "Sıradaki token'ın olasılık \\ndağılımından nasıl \\nseçileceğini değiştirir.")],
  "Temperature.svelte": [("Changes output \\nprobability distribution \\nand randomness \\nof next token.", "Çıktının olasılık \\ndağılımını ve sıradaki \\ntoken'ın rastgeleliğini \\ndeğiştirir.")],
  "SubsequentBlocks.svelte": [('<span class="strong">Transformer<br />Blocks</span>', '<span class="strong">Transformer<br />bloğu daha</span>')],
  "LinearSoftmax.svelte": [("Token ID:", "Token ID:")],
  "Popovers/AttentionWeightPopover.svelte": [("Attention Head ${$attentionHeadIdx + 1} Out", "Dikkat başı ${$attentionHeadIdx + 1} çıktısı")],
  "Popovers/LogitWeightPopover.svelte": [
    ("After passing through all blocks, \\nthe final token's embedding vector \\ncontains all the contextual information \\nfrom the preceding tokens.", "Tüm bloklardan geçtikten sonra \\nson token'ın vektörü önceki \\ntoken'ların bağlam bilgisini taşır."),
    ("Transforms the final embedding into a vocabulary distribution.\\nParameters were learned in training, fixed in prediction.", "Son vektörü sözlük üzerinde bir dağılıma çevirir.\\nParametreler eğitimde öğrenildi, tahminde sabit."),
    ("Offsets added after the transformation.\\nParameters were learned in training, fixed in prediction.", "Dönüşümden sonra eklenen kaymalar.\\nParametreler eğitimde öğrenildi, tahminde sabit."),
    ("Raw scores representing the model’s preference \\nfor each vocabulary token before applying softmax.", "Softmax'tan önce modelin sözlükteki \\nher token için ham tercih puanları."),
  ],
  "Popovers/MLPDownWeightPopover.svelte": [
    ("Expanded latent vectors through MLP expansion layer.", "MLP genişletme katmanından geçmiş vektörler."),
    ("Projects expanded latent vectors back to original space. \\nParameters that learned in training, fixed in prediction.", "Genişletilmiş vektörleri yeniden özgün boyuta indirir. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
    ("Offsets added after compression. \\nParameters that learned in training, fixed in prediction.", "Sıkıştırmadan sonra eklenen kaymalar. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
  ],
  "Popovers/MLPWeightPopover.svelte": [
    ("Embeddings transformed through attention mechanism.", "Dikkat mekanizmasından geçmiş vektörler."),
    ("Projects embedding vectors to expanded latent space. \\nParameters were learned in training, fixed in prediction.", "Vektörleri daha büyük bir boyuta genişletir. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
    ("Offsets added after expansion. \\nParameters that learned in training, fixed in prediction.", "Genişletmeden sonra eklenen kaymalar. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
  ],
  "Popovers/QKVWeightPopover.svelte": [
    ("Embeddings originate from tokens \\nbut evolve through blocks, becoming \\nabstract representations.", "Gömmeler token'lardan doğar, \\nbloklardan geçtikçe soyut \\ntemsillere dönüşür."),
    ("Transforms embedding vectors into Query, Key, and Value vectors. \\nParameters were learned in training, fixed in prediction.", "Vektörleri Sorgu, Anahtar ve Değer vektörlerine dönüştürür. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
    ("Offsets added after transformation. \\nParameters that learned in training, fixed in prediction.", "Dönüşümden sonra eklenen kaymalar. \\nParametreler eğitimde öğrenildi, tahminde sabit."),
  ],
  "Popovers/SoftmaxPopover.svelte": [
    ('Probability of <span class="highlight">"{selected?.token}"</span> token being sampled', '<span class="highlight">"{selected?.token}"</span> token\'ının seçilme olasılığı'),
    (">If logit <Katex", ">Logit <Katex"),
  ],
  "Popovers/ActivationPopover.svelte": [('title="GELU Activation"', 'title="GELU aktivasyonu"')],
  "Popovers/DropoutPopover.svelte": [('title="Dropout"', 'title="Dropout"')],
  "Popovers/LayerNormPopover.svelte": [('title="Layer Normalization"', 'title="Katman normalizasyonu"')],
  "Popovers/ResidualPopover.svelte": [('title="Residual Connection"', 'title="Artık bağlantı"')],
  "Popovers/PositionalEncodingPopover.svelte": [('title="Positional Encoding"', 'title="Konum kodlaması"')],
}
sorun = []
for dosya, harita in DUGUM.items():
    p = D + dosya; s = open(p, encoding="utf-8").read()
    for en, tr in harita.items():
        desen = re.compile(r"(>\s*)" + re.escape(en) + r"(\s*<)")
        s2, n = desen.subn(lambda m: m.group(1) + tr + m.group(2), s)
        if n == 0 and tr not in s: sorun.append((dosya, en))
        s = s2
    open(p, "w", encoding="utf-8").write(s)
for dosya, liste in DUZ.items():
    p = D + dosya; s = open(p, encoding="utf-8").read()
    for en, tr in liste:
        if en in s: s = s.replace(en, tr)
        elif tr not in s: sorun.append((dosya, en[:50]))
    open(p, "w", encoding="utf-8").write(s)
print("bulunamayan:", sorun)
