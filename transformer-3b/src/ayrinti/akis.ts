// TR: Ayrıntılı görünümün 12 adımı: bir Transformer bloğunun içindeki matris işlemleri, gerçek sayılarla.
// Her adımın kendi "tahtası" var; kamera tahtadaki bölgelere (kutu) sırayla odaklanır.
import { GA, GC, GF, GV, IAyrintiVeri } from './veri';
import { okunur, say, yuzde } from '../hikaye/veri';
import { yumusak } from '../hikaye/akis';
import { L, YEREL } from '../llm/tr/dil';

export const H = 0.42;     // hücre boyu
export const B = 1.1;      // matrisler arası boşluk (yatay)
export const BY = 1.8;     // dikey boşluk: C'nin başlığı B ile C arasına sığsın

export type Kutu = [number, number, number, number];   // x0, y0 (alt), x1, y1 (üst)
export interface IKameraKare { t: number; kutu: Kutu; z?: number; yon?: [number, number, number] }

// Matris çarpımı düzeni: A solda, B üstte, C = A·B sağ altta (satırlar ve sütunlar hizalı)
export function carpim(x0: number, y0: number, satir: number, ic: number, sutun: number) {
    let bx = x0 + ic * H + B;
    return {
        A: [x0, y0] as [number, number],
        Bm: [bx, y0 + ic * H + BY] as [number, number],
        C: [bx, y0] as [number, number],
        kutu: [x0 - 2.2, y0 - satir * H, bx + sutun * H, y0 + ic * H + BY + 1.2] as Kutu,
    };
}

export function duzen(n: number, L: number) {
    let T = n, alt = T * H + 1.5;
    let qkv = carpim(0, 0, T, GC, GA);
    let qkvX = (k: number) => qkv.C[0] + k * (GA * H + B);
    let puan = carpim(0, 0, T, GA, T);
    let av = carpim(0, 0, T, T, GA);
    let izd = carpim(0, 0, T, GC, GC);
    let mlp = carpim(0, 0, T, GC, GF);
    let mlpSag = mlp.C[0] + GF * H + 2.2;
    let cikti = carpim(0, 0, 1, GC, GV);
    return {
        T, alt,
        x: { kutu: [-2.4, -T * H, GC * H, 0.9] as Kutu },
        norm: { mu: GC * H + 1.2, sd: GC * H + 2.5, Xn: GC * H + 5.2, kutu: [-2.4, -T * H, GC * H * 2 + 5.2, 0.9] as Kutu },
        qkv, qkvX, qkvKutu: [-2.4, -T * H, qkvX(2) + GA * H, qkv.Bm[1] + 0.8] as Kutu,
        puan, maskeKutu: [-2.4, -T * H, T * H, 1.8] as Kutu,
        sm: { P: T * H + 3, kutu: [-2.4, -T * H, 2 * T * H + 3, 1.8] as Kutu },
        av,
        izd, izdAlt: [izd.C[0], -alt] as [number, number], izdAlt2: [izd.C[0], -2 * alt] as [number, number],
        mlp, mlpG: [mlp.C[0], -alt] as [number, number], mlpSag, mlpX2: [mlpSag, -2 * alt + 0] as [number, number],
        blok: (l: number) => [l * 0.9, 0, -l * 2.2] as [number, number, number],
        blokKutu: [-2.4, -T * H, GC * H + L * 0.9 + 6, 1.2] as Kutu,
        blokZ: -(L - 1) * 1.1,
        cikti,
        cubuk: { kutu: [-1, -1.2, GV * 1.05 + 1, 6] as Kutu },
    };
}
export type IDuzen = ReturnType<typeof duzen>;

export interface IAyrintiAdim {
    baslik: string;
    sure: number;
    vuruslar: (v: IAyrintiVeri) => { t: number; metin: string }[];
    kamera: (D: IDuzen) => IKameraKare[];
}

const P = (t: string) => `"${okunur(t)}"`;
const son = (v: IAyrintiVeri) => P(v.tokenler[v.n - 1]);
const blok = (v: IAyrintiVeri) => L(`${v.katman + 1}. blok`, `block ${v.katman + 1}`);

// Çarpım taramaları: adımın [a, b] saniyelerinde C'nin hücreleri sırayla dolar
export const TARAMA: Record<number, [number, number]> = { 2: [2.5, 7], 3: [2.5, 7], 6: [2.5, 7], 7: [2.5, 6], 8: [2.5, 6], 10: [2.5, 5.5] };

export const AYRINTI_ADIMLARI: IAyrintiAdim[] = [
    {
        baslik: L('Girdi X', 'Input X'), sure: 6,
        vuruslar: v => [
            { t: 0, metin: L(`Bloğun girdisi bir matris: her satır bir parça (${v.n} satır), her sütun bir kanal (${v.C} sütun). Sahnede ${GC} sütun gösteriliyor.`,
                `The block's input is a matrix: each row is a token (${v.n} rows), each column a channel (${v.C} columns). ${GC} columns are shown.`) },
            { t: 3, metin: L(`Renk sayının işaretini ve büyüklüğünü gösterir. Bir hücrenin üstüne gelince tam değerini okuyabilirsiniz. İzlediğimiz blok: ${blok(v)}.`,
                `Color shows the sign and size of a number. Hover over a cell to read its exact value. Block shown: ${blok(v)}.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.x.kutu }],
    },
    {
        baslik: L('Katman normu', 'Layer norm'), sure: 8,
        vuruslar: v => [
            { t: 0, metin: L(`Her satırın ${v.C} sayısının ortalaması (μ) ve standart sapması (σ) bulunur.`,
                `For each row, the mean (μ) and standard deviation (σ) of its ${v.C} numbers are computed.`) },
            { t: 3.4, metin: L(`Her sayıdan μ çıkarılır, σ'ya bölünür; sonra öğrenilmiş γ ile çarpılıp β eklenir. Sonuç: N₁. Satırlar birbirinden bağımsız işlenir.`,
                `μ is subtracted from each number and the result is divided by σ; then it is multiplied by the learned γ and β is added. Result: N₁. Rows are processed independently.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.norm.kutu }],
    },
    {
        baslik: L('Q, K, V', 'Q, K, V'), sure: 10,
        vuruslar: v => [
            { t: 0, metin: L(`N₁ üç ağırlık matrisiyle çarpılır. Her hücre, N₁'in bir satırı ile W'nin bir sütununun nokta çarpımıdır (${v.C} çarpımın toplamı + sapma).`,
                `N₁ is multiplied by three weight matrices. Each cell is the dot product of a row of N₁ and a column of W (a sum of ${v.C} products + bias).`) },
            { t: 2.5, metin: L(`Tarama: N₁'in parlayan satırı × W_Q'nun parlayan sütunu = Q'nun parlayan hücresi. Q soru (sorgu), K etiket (anahtar), V taşınacak bilgi (değer). ${blok(v)}, ${v.bas + 1}. baş (her başta ${v.A} boyut; ${GA}'si görünüyor).`,
                `Scan: the glowing row of N₁ × the glowing column of W_Q = the glowing cell of Q. Q is the question (query), K the label (key), V the information to carry (value). ${blok(v)}, head ${v.bas + 1} (${v.A} dimensions per head; ${GA} shown).`) },
            { t: 7.5, metin: L(`Aynı işlem K ve V için de yapılır. ${v.H} başın her biri kendi W_Q, W_K, W_V matrislerine sahip.`,
                `The same is done for K and V. Each of the ${v.H} heads has its own W_Q, W_K, W_V matrices.`) },
        ],
        kamera: D => [{ t: 0, kutu: [D.qkv.A[0] - 2.4, -D.T * H, D.qkv.C[0] + GA * H, D.qkv.Bm[1] + 0.8] }, { t: 7.5, kutu: D.qkvKutu }],
    },
    {
        baslik: L('Puanlar QKᵀ', 'Scores QKᵀ'), sure: 10,
        vuruslar: v => [
            { t: 0, metin: L(`Her parçanın sorgusu (Q satırı) her parçanın anahtarıyla (Kᵀ sütunu) nokta çarpılır: "bu parça ona ne kadar uyuyor?"`,
                `Each token's query (a row of Q) is dot-multiplied with each token's key (a column of Kᵀ): "how well does this token match that one?"`) },
            { t: 2.5, metin: L(`Sonuç ${v.n}×${v.n} bir puan tablosu. Puanlar √${v.A} = ${Math.sqrt(v.A)} ile bölünür ki softmax aşırı keskinleşmesin.`,
                `The result is an ${v.n}×${v.n} score table. Scores are divided by √${v.A} = ${Math.sqrt(v.A)} so that softmax does not become too sharp.`) },
            { t: 7.5, metin: L(`Son satır ${son(v)} parçasının puanları: en büyük sayı, en çok "bakacağı" parça.`,
                `The last row holds the scores of ${son(v)}: the largest number is the token it will "look at" the most.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.puan.kutu }],
    },
    {
        baslik: L('Nedensel maske', 'Causal mask'), sure: 6,
        vuruslar: () => [
            { t: 0, metin: L(`Model metni soldan sağa üretir: bir parça kendisinden sonra gelenleri göremez.`,
                `The model writes text from left to right: a token cannot see the tokens that come after it.`) },
            { t: 2, metin: L(`Köşegenin üstündeki puanlar −∞ yapılır; softmax'ta bunlar tam 0'a dönüşür. Buna nedensel (causal) maske denir.`,
                `Scores above the diagonal are set to −∞; softmax turns them into exactly 0. This is called the causal mask.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.maskeKutu }],
    },
    {
        baslik: L('Softmax', 'Softmax'), sure: 8,
        vuruslar: v => [
            { t: 0, metin: L(`Her satıra ayrı ayrı softmax uygulanır: üstel al, satır toplamına böl. Her satır toplamı %100 olan dikkat paylarına dönüşür.`,
                `Softmax is applied to each row separately: exponentiate, divide by the row total. Each row becomes attention shares that add up to 100%.`) },
            { t: 4, metin: L(`${son(v)} satırı: payların en büyüğü ${P(v.tokenler[enBuyukJ(v)])} (${yuzde(v.P[v.n - 1][enBuyukJ(v)])}).`,
                `Row ${son(v)}: the largest share goes to ${P(v.tokenler[enBuyukJ(v)])} (${yuzde(v.P[v.n - 1][enBuyukJ(v)])}).`) },
        ],
        kamera: D => [{ t: 0, kutu: D.sm.kutu }],
    },
    {
        baslik: L('Ağırlıklı toplam', 'Weighted sum'), sure: 10,
        vuruslar: v => [
            { t: 0, metin: L(`Dikkat payları (A) değer vektörleriyle (V) çarpılır: her parçanın yeni vektörü, baktığı parçaların V'lerinin ağırlıklı ortalaması.`,
                `The attention shares (A) are multiplied by the value vectors (V): each token's new vector is a weighted average of the V's of the tokens it looks at.`) },
            { t: 2.5, metin: L(`Tarama: A'nın satırı × V'nin sütunu. ${son(v)} satırı, en çok baktığı parçaların bilgisini toplar.`,
                `Scan: a row of A × a column of V. Row ${son(v)} collects the information of the tokens it looks at most.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.av.kutu }],
    },
    {
        baslik: L('Başlar + izdüşüm', 'Heads + projection'), sure: 11,
        vuruslar: v => [
            { t: 0, metin: L(`${v.H} başın ${v.A}'er sayılık çıktısı yan yana dizilir (${v.H} × ${v.A} = ${v.C}) ve W_O ile çarpılır.`,
                `The ${v.A}-number outputs of the ${v.H} heads are placed side by side (${v.H} × ${v.A} = ${v.C}) and multiplied by W_O.`) },
            { t: 6.5, metin: L(`Sonuç bloğun girdisine eklenir: X + dikkat = X'. Bu toplama "artık bağlantı"dır; bilgi hiç kaybolmadan akar.`,
                `The result is added to the block's input: X + attention = X'. This addition is the "residual connection"; information flows on without being lost.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.izd.kutu }, { t: 6.5, kutu: [D.izd.C[0] - 2.4, -3 * D.alt + 1.3, D.izd.C[0] + GC * H + 1, 1.4] }],
    },
    {
        baslik: L('MLP', 'MLP'), sure: 12,
        vuruslar: v => [
            { t: 0, metin: L(`X' yeniden normlanır (N₂) ve W₁ ile çarpılarak ${v.C} kanaldan ${(4 * v.C).toLocaleString(YEREL)} nörona açılır (${GF}'sı görünüyor).`,
                `X' is normalized again (N₂) and multiplied by W₁, expanding ${v.C} channels to ${(4 * v.C).toLocaleString(YEREL)} neurons (${GF} shown).`) },
            { t: 6.5, metin: L(`GELU: negatif değerler sıfıra yakın bastırılır, pozitifler geçer. Alttaki satır GELU'dan sonra; sönen hücrelere bakın.`,
                `GELU: negative values are pushed close to zero, positive ones pass. The lower row is after GELU; look at the cells that go dark.`) },
            { t: 9.2, metin: L(`W₂ ile yeniden ${v.C} kanala inilir ve artık yola eklenir: X' + MLP = bloğun çıktısı.`,
                `W₂ brings it back down to ${v.C} channels and it is added to the residual stream: X' + MLP = the block's output.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.mlp.kutu }, { t: 6.5, kutu: [D.mlp.C[0] - 1, -2 * D.alt, D.mlp.C[0] + GF * H + 1, 0.6] },
            { t: 9.2, kutu: [D.mlpSag - 1.4, -3 * D.alt + 1.3, D.mlpSag + GC * H + 1, -D.alt + 0.8] }],
    },
    {
        baslik: L('12 blok', '12 blocks'), sure: 9,
        vuruslar: v => [
            { t: 0, metin: L(`Her blok aynı matrisi alıp aynı biçimde geri verir (${v.n} × ${v.C}); ${v.L} blok art arda bu matrisi işler.`,
                `Every block takes the same-shaped matrix and returns the same shape (${v.n} × ${v.C}); ${v.L} blocks process it one after another.`) },
            { t: 3.5, metin: L(`Kırmızı satır ${son(v)}: her blokta biraz daha "sıradaki parça" bilgisi taşır. Sahnedeki her levha bir bloğun çıktısı.`,
                `The red row is ${son(v)}: with each block it carries a bit more "next token" information. Each slab in the scene is the output of one block.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.blokKutu, z: D.blokZ, yon: [0.62, 0.22, 0.78] }],
    },
    {
        baslik: L('Çıktı katmanı', 'Output layer'), sure: 9,
        vuruslar: v => [
            { t: 0, metin: L(`Son bloktan sonra ${son(v)} satırı son kez normlanır ve sözlükteki her parçanın gömme vektörüyle nokta çarpılır.`,
                `After the last block, row ${son(v)} is normalized one final time and dot-multiplied with the embedding vector of every token in the vocabulary.`) },
            { t: 2.5, metin: L(`Bu, girişteki gömme tablosunun aynısı (ağırlık paylaşımı). ${v.sozluk.toLocaleString(YEREL)} puan (logit) çıkar; en büyük ${GV}'si görünüyor.`,
                `This is the same embedding table as at the input (weight tying). ${v.sozluk.toLocaleString(YEREL)} scores (logits) come out; the top ${GV} are shown.`) },
        ],
        kamera: D => [{ t: 0, kutu: [D.cikti.kutu[0], D.cikti.kutu[1] - 1.6, D.cikti.kutu[2], D.cikti.kutu[3]] }],
    },
    {
        baslik: L('Sıcaklık', 'Temperature'), sure: 7,
        vuruslar: v => [
            { t: 0, metin: L(`Logitler softmax ile olasılığa çevrilir. Üstteki kaydırıcı sıcaklığı değiştirir: logitler sıcaklığa bölünüp softmax alınır.`,
                `Logits are turned into probabilities with softmax. The slider at the top changes the temperature: logits are divided by the temperature before softmax.`) },
            { t: 3, metin: L(`Düşük sıcaklık en olası parçayı öne çıkarır (daha tutarlı), yüksek sıcaklık dağılımı düzleştirir (daha yaratıcı). En olası: ${P(v.enIyi[0]?.metin ?? '')}.`,
                `A low temperature favors the most likely token (more consistent), a high temperature flattens the distribution (more creative). Most likely: ${P(v.enIyi[0]?.metin ?? '')}.`) },
        ],
        kamera: D => [{ t: 0, kutu: D.cubuk.kutu }],
    },
];

export function enBuyukJ(v: IAyrintiVeri) {
    let r = v.P[v.n - 1], en = 0;
    r.forEach((p, j) => { if (p > r[en]) en = j; });
    return en;
}

// tarama: adım k'de C'nin hangi hücresi dolduruluyor (alt üçgen: yalnızca j ≤ i)
export function tarama(d: { adim: number; t: number }, k: number, satir: number, sutun: number, ucgen = false) {
    let [a, b] = TARAMA[k];
    let f = d.adim > k ? 1 : d.adim < k ? 0 : Math.max(0, Math.min(1, (d.t - a) / (b - a)));
    let N = ucgen ? satir * (satir + 1) / 2 : satir * sutun;
    let say = Math.floor(f * N);
    let aktif = d.adim === k && f > 0 && f < 1;
    let i = 0, j = 0;
    if (ucgen) { let r = say; i = 0; while (r >= i + 1) { r -= i + 1; i++; } j = r; }
    else { i = Math.floor(say / sutun); j = say % sutun; }
    return { f, say, i: Math.min(i, satir - 1), j, aktif };
}

export { yumusak, say as sayi };
