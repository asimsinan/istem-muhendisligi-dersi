// TR: Üç anlatım düzeyi. "Öğrenci" düzeyi akis.ts / ayrinti/akis.ts'teki altyazılardır. Burada her adım için
//   • "Hikaye" düzeyi: aynı zamanlamayla (t) daha sade, benzetmeli altyazılar,
//   • "Mühendis" düzeyi: altyazının altına eklenen formül ve boyutlar
// tanımlanır. Her iki görünüm (anlatım, ayrıntılı) ve iki dil için.
import { IHikayeVeri, okunur, yuzde } from './veri';
import { IAyrintiVeri } from '../ayrinti/veri';
import { enBuyukJ } from '../ayrinti/akis';
import { L, YEREL } from '../llm/tr/dil';

export type Duzey = 'hikaye' | 'ogrenci' | 'muhendis';
export const DUZEYLER: { id: Duzey; ad: string; ipucu: string }[] = [
    { id: 'hikaye', ad: L('Hikaye', 'Story'), ipucu: L('Benzetmelerle, terimsiz anlatım', 'Plain language with analogies') },
    { id: 'ogrenci', ad: L('Öğrenci', 'Student'), ipucu: L('Terimlerle, gerçek sayılarla anlatım', 'With the terms and the real numbers') },
    { id: 'muhendis', ad: L('Mühendis', 'Engineer'), ipucu: L('Öğrenci anlatımı + formül ve boyutlar', 'Student text + formulas and shapes') },
];

interface IVurus { t: number; metin: string }
export interface IDuzeyEk<V> { hikaye: (v: V, d: { katman: number; bas: number }) => IVurus[]; formul: (v: V, d: { katman: number; bas: number }) => string }

const Q = (t: string) => `"${t.trim() || okunur(t)}"`;
const n0 = (x: number) => x.toLocaleString(YEREL);

function enCokBakilan(v: IHikayeVeri, d: { katman: number; bas: number }) {
    let s = v.dikkat[d.katman][d.bas];
    return s.map((p, j) => ({ p, j })).filter(e => e.j !== v.odak).sort((a, b) => b.p - a.p)[0];
}

export const ANLATIM_EK: IDuzeyEk<IHikayeVeri>[] = [
    {   // 0 Cümle
        hikaye: v => [
            { t: 0, metin: L(`Bir cümle geldi: ${v.tokenler.join('')}. Kahramanımız son parça, ${Q(v.tokenler[v.odak])}.`, `A sentence arrives: ${v.tokenler.join('')}. Our hero is the last token, ${Q(v.tokenler[v.odak])}.`) },
            { t: 2.2, metin: L('Model bu cümlenin devamını tahmin edecek. Hadi içine girip nasıl yaptığına bakalım!', 'The model will guess how this sentence continues. Let\'s go inside and see how!') },
        ],
        formul: () => L('görev: P(xₙ₊₁ | x₁ … xₙ), sıradaki parçanın olasılığı', 'task: P(xₙ₊₁ | x₁ … xₙ), probability of the next token'),
    },
    {   // 1 Parçalar
        hikaye: v => [
            { t: 0, metin: L(`Cümle yapboz parçalarına ayrıldı: ${v.n} parça.`, `The sentence is cut into puzzle pieces: ${v.n} tokens.`) },
            { t: 2.5, metin: L('Her parçanın bir numarası var. Model kelimeleri değil, yalnızca bu numaraları görür.', 'Each piece has a number. The model never sees words, only these numbers.') },
        ],
        formul: v => `${L('metin', 'text')} → [id₁ … id${v.n === 1 ? '₁' : 'ₙ'}],  idᵢ ∈ {0 … ${n0(v.V - 1)}}`,
    },
    {   // 2 Gömme
        hikaye: v => [
            { t: 0, metin: L('Her numara, sayılardan yapılmış bir kimlik kartına dönüşür.', 'Each number turns into an ID card made of numbers.') },
            { t: 3, metin: L('Karta bir de sıra numarası eklenir: kim önde, kim arkada?', 'A seat number is added to the card too: who comes first, who comes last?') },
            { t: 5.6, metin: L(`İki kart toplanır. Artık her parça ${v.C} sayıdan oluşan bir liste.`, `The two cards are added. Now each token is a list of ${v.C} numbers.`) },
        ],
        formul: v => `x₀ = E[id] + P[${L('konum', 'pos')}]    E: ${n0(v.V)} × ${v.C},  P: 1024 × ${v.C}`,
    },
    {   // 3 Normalizasyon
        hikaye: v => [
            { t: 0, metin: L(`Bundan sonra kahramanımızı, ${Q(v.tokenler[v.odak])} parçasını izliyoruz.`, `From now on we follow our hero, ${Q(v.tokenler[v.odak])}.`) },
            { t: 2, metin: L('Önce sesi ayarlanır: çok yüksek ya da çok kısık sayılar dengelenir.', 'First its volume is adjusted: numbers that are too loud or too quiet are balanced.') },
            { t: 4.4, metin: L('Böylece sonraki adımlar rahat çalışır.', 'That way the next steps work comfortably.') },
        ],
        formul: () => 'LN(x) = γ ⊙ (x − μ) / √(σ² + ε) + β',
    },
    {   // 4 Dikkat
        hikaye: (v, d) => {
            let en = enCokBakilan(v, d);
            return [
                { t: 0, metin: L(`${Q(v.tokenler[v.odak])} soruyor: "Ben kimden bahsediyorum?" Önceki parçalara tek tek bakıyor.`, `${Q(v.tokenler[v.odak])} asks: "Who am I talking about?" It looks at each earlier token.`) },
                { t: 3, metin: en ? L(`En çok ${Q(v.tokenler[en.j])} parçasına bakıyor (${yuzde(en.p)}). Kalın yay = çok dikkat.`, `It looks most at ${Q(v.tokenler[en.j])} (${yuzde(en.p)}). Thick arc = lots of attention.`) : L('En çok kendisine bakıyor.', 'It looks mostly at itself.') },
                { t: 6.2, metin: L(`Bunu yapan ${v.H} dedektif var; her biri başka bir ipucunun peşinde.`, `${v.H} detectives do this; each one follows a different clue.`) },
            ];
        },
        formul: v => `A = softmax(Q·Kᵀ / √${v.C / v.H} + M),   Q = x·W_Q,  K = x·W_K   (${v.H} ${L('baş', 'heads')} × ${v.C / v.H})`,
    },
    {   // 5 Bilgi akışı
        hikaye: v => [
            { t: 0, metin: L(`Baktığı parçalardan ${Q(v.tokenler[v.odak])} parçasına bilgi akıyor: kime çok baktıysa ondan çok bilgi.`, `Information flows into ${Q(v.tokenler[v.odak])} from the tokens it looked at: more from the ones it looked at more.`) },
            { t: 3.2, metin: L('Gelen bilgi eskisinin üstüne yazılır; hiçbir şey silinmez.', 'The new information is written on top of the old; nothing is erased.') },
        ],
        formul: v => `x ← x + [A₁V₁ … A${v.H === 12 ? '₁₂' : 'ₕ'}V${v.H === 12 ? '₁₂' : 'ₕ'}]·W_O   (${v.H} × ${v.C / v.H} = ${v.C})`,
    },
    {   // 6 MLP
        hikaye: v => [
            { t: 0, metin: L('Şimdi her parça kendi başına düşünüyor.', 'Now each token thinks on its own.') },
            { t: 2.6, metin: L(`Binlerce küçük dedektör yanıp sönüyor; bu parçada ${yuzde(v.etkinOran, 0)} kadarı yanık.`, `Thousands of little detectors flicker; for this token about ${yuzde(v.etkinOran, 0)} are lit.`) },
            { t: 5.2, metin: L('Sonuç yine sütuna eklenir. Bir kat bitti!', 'The result is added to the column again. One floor done!') },
        ],
        formul: v => `x ← x + W₂·GELU(W₁·LN(x) + b₁) + b₂   (${v.C} → ${n0(4 * v.C)} → ${v.C})`,
    },
    {   // 7 12 blok
        hikaye: v => [
            { t: 0, metin: L(`Aynı adımlar ${v.L} kat boyunca tekrarlanır; her katta biraz daha anlar.`, `The same steps repeat over ${v.L} floors; each floor understands a little more.`) },
            { t: 2.5, metin: L('Her kattan sonra "şu an ne tahmin ediyorsun?" diye soruyoruz: cevap giderek netleşiyor.', 'After each floor we ask "what would you guess now?": the answer gets clearer and clearer.') },
        ],
        formul: v => `x⁽ˡ⁺¹⁾ = ${L('Blok', 'Block')}ₗ(x⁽ˡ⁾),   l = 1 … ${v.L}`,
    },
    {   // 8 Olasılıklar
        hikaye: v => [
            { t: 0, metin: L(`Son liste, sözlükteki ${n0(v.V)} parçanın her biriyle karşılaştırılır; her biri bir puan alır.`, `The final list is compared with each of the ${n0(v.V)} tokens in the vocabulary; each one gets a score.`) },
            { t: 3, metin: L('Puanlar yüzdeye çevrilir. En yüksek çubuklar en olası adaylar.', 'Scores become percentages. The tallest bars are the most likely candidates.') },
        ],
        formul: v => `p = softmax(LN(x)·Eᵀ / T),   Eᵀ: ${v.C} × ${n0(v.V)}`,
    },
    {   // 9 Seçim
        hikaye: v => [
            { t: 0, metin: L(`Kazanan: ${Q(v.olasiliklar[0]?.metin ?? '')} (${yuzde(v.olasiliklar[0]?.p ?? 0)}). Cümleye eklenir ve yolculuk yeniden başlar.`, `The winner: ${Q(v.olasiliklar[0]?.metin ?? '')} (${yuzde(v.olasiliklar[0]?.p ?? 0)}). It is appended and the journey starts again.`) },
            { t: 3, metin: L('Sağdaki panelden bir tahmine tıkla, cümleyi sen uzat.', 'Click a prediction in the right panel and extend the sentence yourself.') },
        ],
        formul: () => L('xₙ₊₁ ~ p   (açgözlü seçim: argmax p)', 'xₙ₊₁ ~ p   (greedy: argmax p)'),
    },
];

export const AYRINTI_EK: IDuzeyEk<IAyrintiVeri>[] = [
    {   // 0 Girdi X
        hikaye: v => [
            { t: 0, metin: L('Bu tablo bloğun girdisi: her satır bir parça, her sütun bir sayı.', 'This table is the block\'s input: each row is a token, each column a number.') },
            { t: 3, metin: L('Renkler sayının işaretini ve büyüklüğünü gösterir. Bir hücreye gel, değerini oku.', 'Colors show the sign and size of a number. Hover a cell to read its value.') },
        ],
        formul: v => `X ∈ ℝ^(n × C),   n = ${v.n},  C = ${v.C}   (${L('blok', 'block')} ${v.katman + 1}/${v.L})`,
    },
    {   // 1 Katman normu
        hikaye: () => [
            { t: 0, metin: L('Her satırın ortalaması ve yayılımı ölçülür.', 'The average and the spread of each row are measured.') },
            { t: 3.4, metin: L('Her satır dengelenir: ortalaması 0, yayılımı 1 olur. Satırlar birbirini etkilemez.', 'Each row is balanced: average 0, spread 1. Rows do not affect each other.') },
        ],
        formul: () => L('N₁ = (X − μ) / σ ⊙ γ + β   (satır satır; μ, σ: n × 1)', 'N₁ = (X − μ) / σ ⊙ γ + β   (row by row; μ, σ: n × 1)'),
    },
    {   // 2 Q, K, V
        hikaye: () => [
            { t: 0, metin: L('Her parça üç kart hazırlar: soru (Q), etiket (K) ve paylaşacağı bilgi (V).', 'Each token prepares three cards: a question (Q), a label (K) and the information it will share (V).') },
            { t: 2.5, metin: L('Her hücre bir çarpım sonucu: parlayan satır × parlayan sütun, sayılar eş eş çarpılıp toplanır.', 'Each cell is one product: the glowing row × the glowing column, multiplied number by number and added up.') },
            { t: 7.5, metin: L('Aynısı K ve V için. Her dedektifin (başın) kendi kartları var.', 'The same for K and V. Each detective (head) has its own cards.') },
        ],
        formul: v => `Q = N₁·W_Q + b_Q,  K = N₁·W_K + b_K,  V = N₁·W_V + b_V    W: ${v.C} × ${v.A}  →  Q, K, V: ${v.n} × ${v.A}`,
    },
    {   // 3 Puanlar
        hikaye: v => [
            { t: 0, metin: L('Her soru, her etiketle karşılaştırılır: "bu parça bana ne kadar uyuyor?"', 'Each question is compared with each label: "how well does this token match me?"') },
            { t: 2.5, metin: L('Sonuç bir puan tablosu. Puanlar biraz küçültülür ki sonuç çok sivri olmasın.', 'The result is a score table. Scores are scaled down a little so the result is not too sharp.') },
            { t: 7.5, metin: L(`Son satır ${Q(v.tokenler[v.n - 1])} parçasının puanları: en büyük sayı, en çok ilgilendiği parça.`, `The last row holds the scores of ${Q(v.tokenler[v.n - 1])}: the largest number is the token it cares about most.`) },
        ],
        formul: v => `S = Q·Kᵀ / √${v.A}   (${v.n} × ${v.A}) · (${v.A} × ${v.n}) = ${v.n} × ${v.n}`,
    },
    {   // 4 Maske
        hikaye: () => [
            { t: 0, metin: L('Model geleceği göremez: bir parça yalnızca kendisine ve öncekilere bakabilir.', 'The model cannot see the future: a token can only look at itself and earlier tokens.') },
            { t: 2, metin: L('Bu yüzden köşegenin üstü kapatılır (−∞); oralara hiç dikkat gitmez.', 'So everything above the diagonal is blocked (−∞); no attention goes there.') },
        ],
        formul: () => 'Sᵢⱼ ← −∞   (j > i)',
    },
    {   // 5 Softmax
        hikaye: v => {
            let j = enBuyukJ(v);
            return [
                { t: 0, metin: L('Her satırın puanları yüzdeye çevrilir; her satır toplamı %100.', 'The scores in each row become percentages; each row adds up to 100%.') },
                { t: 4, metin: L(`${Q(v.tokenler[v.n - 1])} en çok ${Q(v.tokenler[j])} parçasına bakıyor (${yuzde(v.P[v.n - 1][j])}).`, `${Q(v.tokenler[v.n - 1])} looks most at ${Q(v.tokenler[j])} (${yuzde(v.P[v.n - 1][j])}).`) },
            ];
        },
        formul: () => 'Aᵢⱼ = exp(Sᵢⱼ) / Σₖ exp(Sᵢₖ)',
    },
    {   // 6 Ağırlıklı toplam
        hikaye: v => [
            { t: 0, metin: L('Her parça, baktığı parçaların bilgisini paylarına göre toplar.', 'Each token collects the information of the tokens it looks at, according to their shares.') },
            { t: 2.5, metin: L(`${Q(v.tokenler[v.n - 1])} satırı, en çok baktığı parçaların bilgisini alır.`, `The ${Q(v.tokenler[v.n - 1])} row receives the information of the tokens it looks at most.`) },
        ],
        formul: v => `O = A·V   (${v.n} × ${v.n}) · (${v.n} × ${v.A}) = ${v.n} × ${v.A}`,
    },
    {   // 7 Başlar + izdüşüm
        hikaye: v => [
            { t: 0, metin: L(`${v.H} dedektifin raporu yan yana dizilir ve tek bir rapora karıştırılır.`, `The reports of the ${v.H} detectives are placed side by side and mixed into one report.`) },
            { t: 6.5, metin: L('Rapor, bloğa giren tablonun üstüne eklenir; eski bilgi kaybolmaz.', 'The report is added on top of the table that entered the block; old information is not lost.') },
        ],
        formul: v => `X' = X + [O₁ … O${v.H === 12 ? '₁₂' : 'ₕ'}]·W_O + b_O   (${v.n} × ${v.C}) · (${v.C} × ${v.C})`,
    },
    {   // 8 MLP
        hikaye: v => [
            { t: 0, metin: L(`Her satır genişletilir: ${v.C} sayıdan ${n0(4 * v.C)} küçük dedektöre.`, `Each row is expanded: from ${v.C} numbers to ${n0(4 * v.C)} little detectors.`) },
            { t: 6.5, metin: L('Zayıf ya da olumsuz sinyaller söner, güçlüler geçer (GELU).', 'Weak or negative signals go dark, strong ones pass (GELU).') },
            { t: 9.2, metin: L(`Sonra yeniden ${v.C} sayıya inilir ve tablonun üstüne eklenir.`, `Then it shrinks back to ${v.C} numbers and is added on top of the table.`) },
        ],
        formul: v => `X₂ = X' + GELU(N₂·W₁ + b₁)·W₂ + b₂    W₁: ${v.C} × ${n0(4 * v.C)},  W₂: ${n0(4 * v.C)} × ${v.C}`,
    },
    {   // 9 12 blok
        hikaye: v => [
            { t: 0, metin: L(`Aynı blok ${v.L} kez uygulanır; her levha bir katın çıktısı.`, `The same block is applied ${v.L} times; each slab is the output of one floor.`) },
            { t: 3.5, metin: L(`Kırmızı satır ${Q(v.tokenler[v.n - 1])}: her katta sıradaki parçayı biraz daha iyi bilir.`, `The red row is ${Q(v.tokenler[v.n - 1])}: on each floor it knows the next token a bit better.`) },
        ],
        formul: v => `X⁽ˡ⁺¹⁾ = ${L('Blok', 'Block')}ₗ(X⁽ˡ⁾),   l = 1 … ${v.L},   X⁽ˡ⁾ ∈ ℝ^(${v.n} × ${v.C})`,
    },
    {   // 10 Çıktı katmanı
        hikaye: () => [
            { t: 0, metin: L('Son satır, sözlükteki her parçanın kartıyla karşılaştırılır.', 'The last row is compared with the card of every token in the vocabulary.') },
            { t: 2.5, metin: L('Her parça bir puan alır; en yüksek puanlılar görünüyor.', 'Every token gets a score; the highest-scoring ones are shown.') },
        ],
        formul: v => `logit = LN_f(h)·Eᵀ   (1 × ${v.C}) · (${v.C} × ${n0(v.sozluk)}) = 1 × ${n0(v.sozluk)}`,
    },
    {   // 11 Sıcaklık
        hikaye: v => [
            { t: 0, metin: L('Puanlar yüzdeye çevrilir. Üstteki kaydırıcı "cesaret düğmesi".', 'Scores become percentages. The slider at the top is the "courage knob".') },
            { t: 3, metin: L(`Düşük sıcaklık temkinli, yüksek sıcaklık cesur seçer. En olası: ${Q(v.enIyi[0]?.metin ?? '')}.`, `Low temperature picks cautiously, high temperature boldly. Most likely: ${Q(v.enIyi[0]?.metin ?? '')}.`) },
        ],
        formul: () => 'p = softmax(logit / T)',
    },
];
