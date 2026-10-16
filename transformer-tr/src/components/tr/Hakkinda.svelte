<!-- TR: Özgün İngilizce makale (Article.svelte) yerine kısa Türkçe açıklama ve atıflar -->
<section class="hakkinda mx-auto max-w-3xl px-6 py-16 text-gray-800">
	<h2>Bu sayfa nedir?</h2>
	<p>
		<b>Transformer Gezgini</b>, Georgia Tech Polo Club'ın <a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener">Transformer Explainer</a>
		aracının <b>İstem Mühendisliği</b> dersi için hazırlanmış Türkçe uyarlamasıdır. Tek fark modeldir: Özgün
		araç İngilizce GPT-2'yi çalıştırır; burada Yıldız Teknik Üniversitesi Cosmos ekibinin Türkçe metinle eğittiği
		Türkçe GPT-2 modelleri çalışıyor: <a href="https://huggingface.co/ytu-ce-cosmos/turkish-gpt2" target="_blank" rel="noopener">küçük</a>
		ve <a href="https://huggingface.co/ytu-ce-cosmos/turkish-gpt2-medium" target="_blank" rel="noopener">orta</a> boy.
	</p>

	<h2>Model</h2>
	<ul>
		<li><b>Küçük model</b> (açılışta yüklenir): 124 milyon parametre · 12 Transformer bloğu · her blokta 12 dikkat başı · 768 boyutlu vektörler. İndirme 210 MB.</li>
		<li><b>Orta model</b> (isteğe bağlı, yazı kutusunun altındaki “Orta modele geç” ile): 355 milyon parametre · 24 blok · her blokta 16 dikkat başı · 1024 boyutlu vektörler. İndirme 470 MB. Türkçesi belirgin biçimde daha tutarlı; her token biraz daha yavaş.</li>
		<li><b>Çok dilli model</b> (isteğe bağlı): Meta'nın 30 dilde eğittiği <a href="https://huggingface.co/facebook/xglm-564M" target="_blank" rel="noopener">XGLM</a>, 564 milyon parametre · 24 blok · 16 baş · 1024 boyut. Yapısı GPT-2'ye çok yakın olduğu için bire bir aktarıldı; sözlüğü 256 binden Türkçe ve İngilizcede kullanılan 40 bin parçaya indirildi. İndirme 478 MB. Her metnin başına <code>&lt;/s&gt;</code> başlangıç işareti koyar. Türkçesi, aynı boydaki yalnız-Türkçe modelden zayıftır: parametrelerini 30 dil paylaşır.</li>
		<li><b>Gemma 3</b> (isteğe bağlı): Google'ın <a href="https://huggingface.co/google/gemma-3-270m" target="_blank" rel="noopener">gemma-3-270m</a> modeli, 270 milyon parametre · 18 blok · 4 sorgu başı (anahtar/değer başı 1, dört başta ortak) · 640 boyut. İndirme 211 MB. Diğer üçünden farklı olarak bugünkü büyük modellerin parçalarını taşır; sayfada bu farklar kırmızı notlarla gösterilir:
			<ul>
				<li><b>RoPE</b>: konum, gömmeye vektör eklenerek değil, dikkatte Sorgu ve Anahtar döndürülerek işlenir.</li>
				<li><b>GQA</b>: dört sorgu başı tek bir anahtar/değer başını paylaşır.</li>
				<li><b>RMSNorm</b>: ortalamayı çıkarmayan, daha basit normalizasyon; her alt katmanın hem önünde hem arkasında.</li>
				<li><b>GeGLU</b>: kapılı MLP (GELU(kapı) × yukarı); sapma (bias) hiçbir katmanda yok.</li>
			</ul>
			Sözlüğü 262 binden Türkçe ve İngilizcede kullanılan 49 bin parçaya indirildi; metnin başına <code>&lt;bos&gt;</code> koyar. Katmanlarının çoğu yalnızca son 512 token'a bakar (kayan pencere); buradaki kısa metinlerde bu fark etmez. Boyutu küçük olduğu ve parametrelerini birçok dil paylaştığı için Türkçesi zayıftır.</li>
		<li>Küçük ve orta model aynı 50.257 token'lık sözlüğü kullanır; XGLM ve Gemma'nın sözlükleri farklıdır, aynı cümleyi başka parçalara böler.</li>
		<li>Model sizin tarayıcınızda çalışır; hiçbir metin bir sunucuya gönderilmez.</li>
		<li>Tarayıcıda çalışabilmesi için ağırlıklar 8 bite sıkıştırıldı (küçük model 600 MB yerine 210 MB, orta model 1,4 GB yerine 470 MB, XGLM 2,3 GB yerine 478 MB, Gemma 650 MB yerine 211 MB). İlk açılışta iner, sonra tarayıcıda saklanır.</li>
		<li>Telefon ve tablette model indirilmez; hazır Türkçe örnekler gösterilir. Kendi cümlenizi yazmak için bilgisayardan açın.</li>
	</ul>

	<h2>Nasıl kullanılır?</h2>
	<ol>
		<li>Üstteki kutuya en fazla 12 kelimelik bir Türkçe cümle yazın ve <b>Üret</b>'e basın.</li>
		<li>Ortadaki dikkat kutusunda bir kelimenin üzerine gelin: hangi kelimelere ne kadar baktığını görün. Okları kullanarak başlar ve bloklar arasında gezin (küçük modelde 12 baş ve 12 blok, orta modelde ve XGLM'de 16 ve 24, Gemma'da 4 ve 18).</li>
		<li>Sağdaki listede sıradaki kelime adaylarını görün; <b>Sıcaklık</b> ve <b>Örnekleme</b> (top-k, top-p) ayarlarıyla seçimin nasıl değiştiğini izleyin.</li>
	</ol>

	<h2>Unutmayın</h2>
	<p>
		Buradaki modellerin hepsi küçük; bugünün sohbet uygulamalarındaki modellerden binlerce kat küçük. Cevapları
		sık sık tuhaf, tekrarlı ya da yanlış olabilir. Amaç doğru cevap almak değil, bir dil modelinin içinde ne olduğunu
		görmek.
	</p>

	<h2>Atıf ve lisans</h2>
	<ul>
		<li>
			Transformer Explainer: Aeree Cho, Grace C. Kim, Alexander Karpekov, Seongmin Lee, Alec Helbling, Benjamin Hoover,
			Zijie J. Wang, Minsuk Kahng, Duen Horng Chau (Georgia Institute of Technology). MIT lisansı.
			<a href="https://github.com/poloclub/transformer-explainer" target="_blank" rel="noopener">Kaynak kod</a> ·
			<a href="https://arxiv.org/abs/2408.04619" target="_blank" rel="noopener">Makale</a>
		</li>
		<li>Türkçe GPT-2: YTÜ Cosmos (ytu-ce-cosmos/turkish-gpt2 ve turkish-gpt2-medium), MIT lisansı.</li>
		<li>XGLM: Lin vd., “Few-shot Learning with Multilingual Generative Language Models” (Meta AI, 2022), facebook/xglm-564M, MIT lisansı.</li>
		<li>Gemma 3: Gemma Team, Google DeepMind, “Gemma 3 Technical Report” (2025), google/gemma-3-270m. Gemma is provided under and subject to the Gemma Terms of Use found at <a href="https://ai.google.dev/gemma/terms" target="_blank" rel="noopener">ai.google.dev/gemma/terms</a>. Kullanım, <a href="https://ai.google.dev/gemma/prohibited_use_policy" target="_blank" rel="noopener">Gemma Yasaklı Kullanım Politikası</a>'na tabidir. Bu sayfadaki sürüm değiştirilmiştir: sözlük budandı, ağırlıklar 8 bite sıkıştırıldı ve ONNX'e aktarıldı.</li>
		<li>Türkçe uyarlama: İstem Mühendisliği dersi, SDÜ Bilgisayar Mühendisliği · <a href="https://istem-muhendisligi-dersi.vercel.app/" target="_blank" rel="noopener">ders sitesi</a></li>
	</ul>
</section>

<style>
	.hakkinda h2 { font-size: 1.5rem; font-weight: 700; margin: 2rem 0 0.75rem; }
	.hakkinda p, .hakkinda li { font-size: 1.05rem; line-height: 1.7; }
	.hakkinda ul { list-style: disc; padding-left: 1.4rem; }
	.hakkinda ol { list-style: decimal; padding-left: 1.4rem; }
	.hakkinda li { margin-bottom: 0.4rem; }
	.hakkinda a { color: #c8102e; text-decoration: underline; }
</style>
