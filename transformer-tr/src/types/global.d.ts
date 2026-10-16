type Flow = {
	type?: 'path' | 'node';
	id: string;
	from?: string;
	to?: string;
	match?: boolean;
	arrow?: boolean;
	anchor?: { from?: 'l' | 'r' | 't' | 'b'; to?: 'l' | 'r' | 't' | 'b' };
	stroke?: { width?: number };
	transition?: gsap.TweenVars & { position?: gsap.Position };
	curve?: 'vh' | 'hv';
};

type MatrixData = number[][];

type ModelMetaData = {
	layer_num: number;
	attention_head_num: number;
	dimension: number;
	chunkTotal?: number;
	// TR: GPT-2 dışı mimariler için (Gemma). Verilmezse GPT-2 varsayılır.
	head_dim?: number; // bir dikkat başının boyutu (GPT-2: dimension / attention_head_num)
	kv_head_num?: number; // anahtar/değer başı sayısı (GPT-2: attention_head_num)
	mlp_dim?: number; // MLP ara katman boyutu (GPT-2: 4 × dimension)
	mimari?: 'gpt2' | 'gemma';
	sozluk?: number; // sözlükteki token sayısı (logit sayısı)
};

type HighlightedToken = {
	index: number | string | null;
	value?: string | null;
	fix?: boolean;
};

type HighlightedHead = {
	index: number | string | null;
	value?: string | null;
	fix?: boolean;
};

type ExpandedBlock = { id: number | string | null };

type Probability = {
	rank: number;
	tokenId: number;
	token: string;
	logit: number;
	scaledLogit: number;
	expLogit: number;
	probability: number;
	topKLogit?: number;
	topPProbability?: number;
	cumulativeProbability?: number;
	cutoffIndex?: number;
};
type Probabilities = Probability[];
type ModelData = {
	logits: number[];
	outputs: Record<string, { data: number[][]; dims: number[]; size: number }>;
	probabilities: Probabilities;
	sampled: Probability;
};

type Sampling = { type: 'top-k' | 'top-p'; value: number };
