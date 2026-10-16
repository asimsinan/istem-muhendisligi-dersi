// TR: Dil (TR/EN). Site iki kez derlenir: Türkçe (/transformer-3b/) ve İngilizce (/transformer-3b/en/, NEXT_PUBLIC_DIL=en).
// İngilizce sürüm özgün OpenAI GPT-2'yi (124M) çalıştırır; Türkçe sürüm YTÜ Cosmos Türkçe GPT-2'yi.
// Dil derleme anında sabit olduğundan sunucu ve tarayıcı aynı metni üretir (hidrasyon uyuşmazlığı olmaz).
export type Dil = 'tr' | 'en';
export const DIL: Dil = process.env.NEXT_PUBLIC_DIL === 'en' ? 'en' : 'tr';
export const EN = DIL === 'en';
/** Türkçe ve İngilizce metinden derlenen dile uygun olanı */
export const L = <T,>(tr: T, en: T): T => (EN ? en : tr);
export const YEREL = EN ? 'en-US' : 'tr-TR';
// Karşı dildeki aynı görünümün adresi ve 2B sayfanın adresi
export const TABAN_TR = '/transformer-3b';
export const TABAN_EN = '/transformer-3b/en';
export const KARSI_TABAN = EN ? TABAN_TR : TABAN_EN;
export const ADRES_2B = EN ? '/transformer/en/' : '/transformer/';
export const MODEL_ADI = L('Türkçe GPT-2', 'GPT-2 (OpenAI)');
