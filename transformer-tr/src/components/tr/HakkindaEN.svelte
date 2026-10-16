<!-- TR: İngilizce sürümün (/transformer/en/) "Hakkında" bölümü -->
<section class="hakkinda mx-auto max-w-3xl px-6 py-16 text-gray-800">
	<h2>What is this page?</h2>
	<p>
		<b>Transformer Explorer</b> is an adaptation of Georgia Tech Polo Club's <a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener">Transformer Explainer</a>,
		prepared for the <b>Prompt Engineering</b> course at Süleyman Demirel University (SDÜ), Computer Engineering. This English version runs OpenAI's original
		<a href="https://huggingface.co/openai-community/gpt2" target="_blank" rel="noopener">GPT-2</a> (small). The Turkish version
		(<a href="/transformer/" rel="external" data-sveltekit-reload>TR</a>) runs a GPT-2 trained on Turkish text, plus optional medium, multilingual (XGLM) and Gemma 3 models.
	</p>

	<h2>Model</h2>
	<ul>
		<li><b>GPT-2 small</b>: 124 million parameters · 12 Transformer blocks · 12 attention heads per block · 768-dimensional vectors · a vocabulary of 50,257 tokens.</li>
		<li>The model runs in your browser; no text is sent to a server.</li>
		<li>To run in the browser, the weights were compressed to 8 bits (224 MB instead of 600 MB). It downloads on first visit and is then cached by your browser.</li>
		<li>On phones and tablets the model is not downloaded; precomputed examples are shown. Open the page on a computer to type your own sentence.</li>
	</ul>

	<h2>How to use</h2>
	<ol>
		<li>Type a sentence of up to 12 words in the box at the top and press <b>Generate</b>.</li>
		<li>Hover over a word in the attention box in the middle to see how much it looks at each word. Use the arrows to move between heads and blocks (12 heads and 12 blocks).</li>
		<li>See the candidates for the next word in the list on the right; watch how <b>Temperature</b> and <b>Sampling</b> (top-k, top-p) change the choice.</li>
	</ol>

	<h2>Keep in mind</h2>
	<p>
		GPT-2 small is tiny: thousands of times smaller than the models in today's chat apps. Its answers are often odd,
		repetitive or wrong. The goal is not to get a correct answer but to see what happens inside a language model.
	</p>

	<h2>Credits and license</h2>
	<ul>
		<li>
			Transformer Explainer: Aeree Cho, Grace C. Kim, Alexander Karpekov, Seongmin Lee, Alec Helbling, Benjamin Hoover,
			Zijie J. Wang, Minsuk Kahng, Duen Horng Chau (Georgia Institute of Technology). MIT license.
			<a href="https://github.com/poloclub/transformer-explainer" target="_blank" rel="noopener">Source code</a> ·
			<a href="https://arxiv.org/abs/2408.04619" target="_blank" rel="noopener">Paper</a>
		</li>
		<li>GPT-2: Radford et al., “Language Models are Unsupervised Multitask Learners” (OpenAI, 2019), openai-community/gpt2, MIT license.</li>
		<li>Adaptation: Prompt Engineering course, SDÜ Computer Engineering · <a href="https://istem-muhendisligi-dersi.vercel.app/" target="_blank" rel="noopener">course site (Turkish)</a></li>
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
