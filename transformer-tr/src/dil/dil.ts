// TR: Dil (TR/EN). 2B sayfa iki kez derlenir: Türkçe (/transformer/) ve İngilizce (/transformer/en/, VITE_DIL=en).
// İngilizce sürüm özgün OpenAI GPT-2'yi (124M) çalıştırır. Arayüz yazıları kaynakta Türkçe durur; İngilizce derlemede
// vite.config.ts'teki "ceviri-en" eklentisi src/dil/en.json'daki çiftlerle değiştirir. Mantık farkları (model, örnekler,
// sayı biçimi) burada, EN sabitiyle seçilir.
export const EN = import.meta.env.VITE_DIL === 'en';
export const L = <T>(tr: T, en: T): T => (EN ? en : tr);
export const YEREL = EN ? 'en-US' : 'tr-TR';
