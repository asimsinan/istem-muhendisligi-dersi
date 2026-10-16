const CACHE_PREFIX = 'onnx-model-cache';
// TR: Türkçe ve İngilizce sürüm aynı sitede: ikisinin önbelleği de korunur, yalnızca eski sürümler silinir
const EN = import.meta.env.VITE_DIL === 'en';
const CACHE_NAME = `${CACHE_PREFIX}-${EN ? 'en' : 'tr'}-v1`;
const KORUNAN = [`${CACHE_PREFIX}-tr-v1`, `${CACHE_PREFIX}-en-v1`];

// TR: Sınıf ağında tek bir parçanın yarıda kesilmesi bütün modeli düşürmesin: ağ hatası ya da 5xx'te
// 3 kez dener (1 s, 3 s bekleyerek). 4xx (dosya yok, erişim yok) hemen hata verir; yedek kaynağa geçilir.
async function getir(url, cache, deneme = 3) {
	for (let i = 1; ; i++) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				const hata = new Error(`Failed to fetch ${url} (${response.status})`);
				hata.kalici = response.status >= 400 && response.status < 500;
				throw hata;
			}
			// TR: Site, olmayan dosya için 404 yerine ana sayfayı (HTML, 200) döndürür: bunu "yok" say, önbelleğe yazma
			if ((response.headers.get('content-type') || '').includes('text/html')) {
				const hata = new Error(`Dosya yok: ${url}`);
				hata.kalici = true;
				throw hata;
			}
			// TR: Depolama kotası dolarsa (gizli pencere, dolu disk) önbelleğe yazmadan devam et
			cache.put(url, response.clone()).catch(() => {});
			return await response.arrayBuffer();
		} catch (hata) {
			if (hata.kalici || i >= deneme) throw hata;
			await new Promise((r) => setTimeout(r, i === 1 ? 1000 : 3000));
		}
	}
}

async function fetchModelChunks(chunkUrls, onProgress) {
	await clearOldCaches();

	let hasCache = false;
	const cache = await caches.open(CACHE_NAME);
	// TR: önceden yanlışlıkla saklanmış HTML yanıtlarını (site ana sayfası) at
	const cachedResponses = await Promise.all(
		chunkUrls.map(async (url) => {
			const r = await cache.match(url);
			if (r && (r.headers.get('content-type') || '').includes('text/html')) {
				await cache.delete(url);
				return undefined;
			}
			return r;
		})
	);

	// TR: ilerleme (inen ya da önbellekten gelen parça sayısı)
	let biten = 0;
	const bitti = (buf) => {
		biten += 1;
		onProgress?.(biten / chunkUrls.length);
		return buf;
	};

	// add cache
	const fetchPromises = chunkUrls.map((url, index) => {
		if (!cachedResponses[index]) {
			// console.log(`Fetching and caching: ${url}`);
			return getir(url, cache).then(bitti);
		} else {
			hasCache = true;
			// console.log(`Using cached version: ${url}`);
			return cachedResponses[index].arrayBuffer().then(bitti);
		}
	});

	const modelBuffers = await Promise.all(fetchPromises);
	return { hasCache, modelBuffers };
}

// TR: Model parçaları önce Hugging Face'ten istenir; orada yoksa ya da erişilemezse sitenin kendi kopyasına düşülür.
export const HF_MODEL_DEPOSU = 'https://huggingface.co/asy83/turkish-gpt2-explainer-onnx/resolve/main';

export async function fetchModelParcalari(klasor, dosya, adet, yerelTaban, onProgress) {
	const urller = (taban) => Array.from({ length: adet }, (_, i) => `${taban}/${klasor}/${dosya}.part${i}`);
	try {
		return await fetchAndMergeChunks(urller(HF_MODEL_DEPOSU), onProgress);
	} catch (hata) {
		console.warn('Hugging Face kopyası alınamadı, sitedeki kopya deneniyor:', hata?.message);
		onProgress?.(0);
		return await fetchAndMergeChunks(urller(yerelTaban), onProgress);
	}
}

export async function fetchAndMergeChunks(urls, onProgress) {
	const { hasCache, modelBuffers: chunks } = await fetchModelChunks(urls, onProgress);
	const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const mergedArray = new Uint8Array(totalSize);
	let offset = 0;
	for (const chunk of chunks) {
		mergedArray.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	return { hasCache, mergedArray: mergedArray.buffer };
}

async function clearOldCaches() {
	const cacheNames = await caches.keys();
	await Promise.all(
		cacheNames.map((name) => {
			if (!KORUNAN.includes(name) && name.includes(CACHE_PREFIX)) {
				console.log(`Deleting old cache: ${name}`);
				return caches.delete(name);
			}
		})
	);
}
