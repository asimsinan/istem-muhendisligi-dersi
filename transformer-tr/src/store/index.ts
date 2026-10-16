import { writable, derived, readable } from 'svelte/store';
import * as ort from 'onnxruntime-web';
import tailwindConfig from '../../tailwind.config';
import resolveConfig from 'tailwindcss/resolveConfig';
import { ex0 } from '$ornekler';
import { EN, YEREL } from '~/dil/dil';
import { textPages } from '~/utils/textbookPages';

const { theme } = resolveConfig(tailwindConfig);

export const attentionHeadIdxTemp = writable(0);
export const attentionHeadIdx = writable(0);
export const blockIdxTemp = writable(0);
export const blockIdx = writable(0);
export const isOnBlockTransition = writable(false);

export const isOnAnimation = writable(false);

// Textbook state management
export const textbookCurrentPage = writable<number>(0);
export const textbookPreviousPage = writable<number>(-1);
export const textbookCurrentPageId = writable<string>(textPages[0].id);
export const textbookPreviousPageId = writable<string>('');
export const isTextbookOpen = writable<boolean>(true);

// is transformer running?
export const isModelRunning = writable(false);
export const isFetchingModel = writable(true);
export const isLoaded = writable(false);
// TR: Model indirme durumu (sayfada görünür gösterge için)
export const modelDurum = writable<'iniyor' | 'hazirlaniyor' | 'hazir' | 'hata'>('iniyor');
export const modelIlerleme = writable(0); // 0–1, inen parça oranı
// TR: Sayfadaki modeller. Küçük model açılışta iner; diğerleri seçilince (parçalar Hugging Face'ten).
// İngilizce sürümde yalnızca özgün OpenAI GPT-2 (küçük) var.
export const MODELLER: Record<string, { kisa: string; uzun: string; boyut: string; klasor?: string; dosya?: string; parca?: number; tokenizer: string }> = EN ? {
	gpt2: { kisa: 'GPT-2', uzun: 'GPT-2 small · OpenAI · 124M', boyut: '224 MB', tokenizer: 'gpt2-en' }
} : {
	gpt2: { kisa: 'Küçük', uzun: 'Türkçe GPT-2 küçük · YTÜ Cosmos · 124M', boyut: '210 MB', tokenizer: 'turkish-gpt2' },
	'gpt2-medium': { kisa: 'Orta', uzun: 'Türkçe GPT-2 orta · YTÜ Cosmos · 355M', boyut: '470 MB',
		klasor: 'model-tr-orta', dosya: 'gpt2-tr-orta.onnx', parca: 45, tokenizer: 'turkish-gpt2' },
	xglm: { kisa: 'Çok dilli', uzun: 'XGLM · Meta · 30 dil · 564M', boyut: '478 MB',
		klasor: 'model-xglm', dosya: 'gpt2-tr-xglm.onnx', parca: 46, tokenizer: 'xglm-tr' },
	gemma: { kisa: 'Gemma', uzun: 'Gemma 3 · Google · çok dilli · 270M · yeni mimari (RoPE, GQA, RMSNorm, GeGLU)', boyut: '211 MB',
		klasor: 'model-gemma', dosya: 'gpt2-tr-gemma.onnx', parca: 21, tokenizer: 'gemma-tr' }
};
export type EkDurum = 'yok' | 'iniyor' | 'hazirlaniyor' | 'hazir' | 'hata';
export const ekDurum = writable<Record<string, EkDurum>>({});
export const ekIlerleme = writable<Record<string, number>>({});
export const istenenModel = writable<string>('gpt2'); // kullanıcının seçtiği

export const inputTextExample = EN ? [
	'The capital of France is',
	'Alice gave the book to Mary because she',
	'Data visualization empowers users to',
	'The most famous dish in Italy is',
	'Once upon a time, in a land far away,'
] : [
	"Türkiye'nin başkenti",
	"Ali kitabı Ayşe'ye verdi çünkü o",
	'Denizde yüzdükten sonra yüzünü',
	"Isparta'nın en meşhur ürünü",
	'Bir varmış bir yokmuş, evvel zaman içinde'
];

const initialExIdx = 0;
export const selectedExampleIdx = writable<number>(initialExIdx);

export const modelSession = writable<ort.InferenceSession>();

// transformer model output
export const modelData = writable<ModelData>(ex0);
export const predictedToken = writable<Probability>();
export const tokens = writable<string[]>(ex0?.tokens);
export const tokenIds = writable<number[]>(ex0?.tokenIds);

export const modelMetaMap: Record<string, ModelMetaData> = {
	gpt2: { layer_num: 12, attention_head_num: 12, dimension: 768, chunkTotal: 20, sozluk: 50257 }, // TR: ytu-ce-cosmos/turkish-gpt2, int8 + fp16 gömme, 210 MB
	'gpt2-medium': { layer_num: 24, attention_head_num: 16, dimension: 1024, chunkTotal: 45, sozluk: 50257 }, // TR: ytu-ce-cosmos/turkish-gpt2-medium, 470 MB
	'gpt2-large': { layer_num: 36, attention_head_num: 20, dimension: 1280 },
	xglm: { layer_num: 24, attention_head_num: 16, dimension: 1024, sozluk: 40000 }, // TR: facebook/xglm-564M, GPT-2 yapısına aktarıldı, sözlük 40 bin
	// TR: google/gemma-3-270m: RoPE, RMSNorm, 4 sorgu başı + 1 ortak K/V başı (GQA), kapılı MLP (GeGLU), sözlük ~49 bin
	gemma: { layer_num: 18, attention_head_num: 4, dimension: 640, head_dim: 256, kv_head_num: 1, mlp_dim: 2048, mimari: 'gemma', sozluk: 48739 }
};
// TR: Mimariye göre boyutlar (bileşenler bunları kullanır)
export const basBoyutu = (m: ModelMetaData) => m.head_dim ?? m.dimension / m.attention_head_num;
export const mlpBoyutu = (m: ModelMetaData) => m.mlp_dim ?? m.dimension * 4;
export const qkvBoyutu = (m: ModelMetaData) => basBoyutu(m) * (m.attention_head_num + 2 * (m.kv_head_num ?? m.attention_head_num));
export const sayiTR = (n?: number) => (n ?? 0).toLocaleString(YEREL);
export const gemmaMi = (m?: ModelMetaData) => m?.mimari === 'gemma';

// selected token vector
export const highlightedToken = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

export const highlightedHead = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

// expanded block
export const expandedBlock = writable<ExpandedBlock>({ id: null });
export const isExpandOrCollapseRunning = writable(false);

// user input text
export const inputText = writable(inputTextExample[initialExIdx]);
// export const tokens = derived(inputText, ($inputText) => $inputText.trim().split(' '));

// selected model and meta data
const initialSelectedModel = 'gpt2';
export const selectedModel = writable(initialSelectedModel);
export const modelMeta = derived(selectedModel, ($selectedModel) => modelMetaMap[$selectedModel]);

// Temperature setting
export const initialTemperature = 0.8;
export const temperature = writable(initialTemperature);

// Sampling
export const sampling = writable<Sampling>({ type: 'top-k', value: 5 });

// Prediction visual
export const highlightedIndex = writable(null);
export const finalTokenIndex = writable(null);

// Visual element style
export const rootRem = 16;
export const minVectorHeight = 12;
export const maxVectorHeight = 30;
export const maxVectorScale = 3.4;

export const vectorHeight = writable(0);
export const headContentHeight = writable(0);
export const headGap = { x: 5, y: 8, scale: 0 };

export const isBoundingBoxActive = writable(false);

export const predictedColor = theme.colors.purple[600];

// Interactivity
export const hoveredPath = writable();
export const hoveredMatrixCell = writable({ row: null, col: null });
export const weightPopover = writable();
export const tooltip = writable();

export const isMobile = readable(false, (set) => {
	if (typeof window !== 'undefined') {
		// Only run in browser environment
		const userAgent = navigator.userAgent.toLowerCase();
		set(/android|iphone|ipad|ipod/i.test(userAgent));
	}
	return () => {}; // Cleanup function
});

// User identification
export const userId = writable<string | null>(null);