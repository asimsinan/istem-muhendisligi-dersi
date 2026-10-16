// TR: 3B görünüm ayarları
import { L } from './dil';
export const T_GORUNUM = 24; // sahnede gösterilen en fazla token (yazı kutusu buna göre sınırlanır)
// Anlatımın örneği: 2B sayfadaki ve M2.3 videosundaki dikkat örneğiyle aynı ("o" kim?)
export const ORNEK_CUMLE = L("Ali kitabı Ayşe'ye verdi çünkü o", 'Alice gave the book to Mary because she');

// TR: Türkçe GPT-2'nin gerçek boyutları (anlatımdaki sayılar bunlardan gelir)
export const GERCEK = { C: 768, A: 64, nHeads: 12, nBlocks: 12, V: 50257, tMaks: 1024, parametre: 124_439_808 };

// TR: Özet görünüm (varsayılan): 768 kanal sahnede her 8'incisiyle (96 hücre) çizilir; baş başına 64 boyuttan 8'i,
// MLP'nin 3.072 nöronundan 384'ü görünür. Hesap her zaman tam modelle yapılır, yalnızca çizim seyreltilir.
// Böylece hücreler, oklar ve girdi/çıktı kutuları nano-gpt'deki gibi yakınlaşmadan okunur.
// "?boyut=gercek" adresi bütün hücreleri çizer (bloklar ~8 kat büyük; hücreler için yakınlaşmak gerekir).
export const GERCEK_BOYUT = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('boyut') === 'gercek';
export const OZET = !GERCEK_BOYUT;
export const KANAL_ADIMI = OZET ? 8 : 1;

// Büyük sözlükler sahnede k'lık gruplarla gösterilir (özet: ~190, gerçek boyut: ~2.000 hücre). Küçük sözlükler olduğu gibi.
export const sozlukGrubu = (V: number) => (V > 4096 ? Math.ceil(V / (OZET ? 192 : 2048)) : 1);

export function gorunumAdresi(gercek: boolean) {
    let u = new URL(window.location.href);
    if (gercek) u.searchParams.set('boyut', 'gercek'); else u.searchParams.delete('boyut');
    return u.toString();
}
