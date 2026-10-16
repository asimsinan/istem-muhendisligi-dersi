// TR: Anlatımın akışı: 10 adım, her adımda zamanlanmış "vuruşlar" (altyazı cümleleri) ve elle kurgulanmış kamera.
// Sahne bileşenleri hangi adımda ve adımın kaçıncı saniyesinde olunduğuna bakarak kendi animasyonunu hesaplar;
// böylece oynat/duraklat, hız, geri/ileri ve adıma atlama tek bir saatle yönetilir.
import { IHikayeVeri, okunur, say, yuzde, kucukSay } from './veri';
import { L, YEREL } from '../llm/tr/dil';
const say0 = (n: number) => n.toLocaleString(YEREL);

export interface IYerlesim {
    n: number;
    aralik: number;              // parçalar arası uzaklık
    x: (j: number) => number;    // j. parçanın x konumu
    kartY: number;               // kartların merkezi
    seritUst: number;            // vektör şeridinin üstü
    hucre: number;               // şerit hücresinin yüksekliği (aralıklı)
    noronX: number;              // MLP nöron ızgarasının sol kenarı
    kuleUst: number;             // 12 blok kulesinin üstü
    kuleAdim: number;
    cubukY: number;              // olasılık çubuklarının tabanı
    genislik: number;
}

export function yerlesim(n: number): IYerlesim {
    let aralik = Math.max(2.3, Math.min(3.4, 30 / Math.max(n, 1)));
    let x = (j: number) => (j - (n - 1) / 2) * aralik;
    return {
        n, aralik, x,
        kartY: 4.2,
        seritUst: 2.6,
        hucre: 0.3,
        noronX: x(n - 1) + 1.6,
        kuleUst: -4.6,
        kuleAdim: 1.35,
        cubukY: -24,
        genislik: (n - 1) * aralik + 2,
    };
}

export interface IVurus { t: number; metin: string }
export interface IKamera { poz: [number, number, number]; hedef: [number, number, number] }

export interface IAdim {
    baslik: string;
    sure: number;
    vuruslar: (v: IHikayeVeri, d: { katman: number; bas: number }) => IVurus[];
    kamera: (y: IYerlesim) => IKamera;
}

const P = (t: string) => `"${okunur(t).trim() || okunur(t)}"`;

export const ADIMLAR: IAdim[] = [
    {
        baslik: L('Cümle', 'Sentence'),
        sure: 5,
        vuruslar: v => [
            { t: 0, metin: L(`Model bir cümle okuyor: ${v.tokenler.join('')}`,
                `The model reads a sentence: ${v.tokenler.join('')}`) },
            { t: 2.2, metin: L(`Görevi tek: bu cümleden sonra gelecek parçayı tahmin etmek. Şimdi bunu nasıl yaptığını adım adım izleyeceğiz.`,
                `Its only job: predict the token that comes after this sentence. Let's watch, step by step, how it does that.`) },
        ],
        kamera: y => ({ poz: [0, 4.4, 12.5 + y.genislik * 0.55], hedef: [0, 3.8, 0] }),
    },
    {
        baslik: L('Parçalar', 'Tokens'),
        sure: 6,
        vuruslar: v => [
            { t: 0, metin: L(`Metin önce ${v.n} parçaya (token) bölünür. Bir parça bir kelime, kelimenin bir kısmı ya da bir işaret olabilir.`,
                `First the text is split into ${v.n} pieces (tokens). A token can be a word, part of a word or a punctuation mark.`) },
            { t: 2.5, metin: L(`Her parçanın sözlükte bir numarası var (sözlükte ${v.V.toLocaleString(YEREL)} parça). Model aslında yalnızca bu numaraları görür.`,
                `Each token has a number in the vocabulary (${say0(v.V)} tokens in total). The model only ever sees these numbers.`) },
        ],
        kamera: y => ({ poz: [0, 3.9, 11.5 + y.genislik * 0.52], hedef: [0, 3.4, 0] }),
    },
    {
        baslik: L('Gömme', 'Embedding'),
        sure: 9,
        vuruslar: v => [
            { t: 0, metin: L(`Her numara için büyük bir tablodan ${v.C} sayılık bir sütun alınır: parçanın "anlam vektörü" (token gömmesi). Sahnede bu sayılardan ${16}'sı görünüyor. Mavi (+) ve turuncu (−) hücreler, eğitimde öğrenilmiş ağırlıklar.`,
                `For each number, a ${v.C}-number column is taken from a big table: the token's "meaning vector" (token embedding). ${16} of these numbers are shown. Blue (+) and orange (−) cells are weights learned in training.`) },
            { t: 3, metin: L(`Parçanın cümledeki yeri de ayrı bir vektörle eklenir (konum gömmesi, yine mavi-turuncu): aynı kelime başta ve sonda farklı rol oynar.`,
                `The token's position in the sentence is added as another vector (position embedding, also blue-orange): the same word plays different roles at the start and at the end.`) },
            { t: 5.6, metin: L(`İki mavi-turuncu şerit toplanıp tek bir şeride dönüşür. Renk de değişir: yeşil (+) ve pembe (−) artık modelin işlediği sayılar. Her parça ${v.C} sayılık bir vektör.`,
                `The two blue-orange strips are added into one. The colors change too: green (+) and pink (−) are now numbers the model is processing. Each token is a ${v.C}-number vector.`) },
        ],
        kamera: y => ({ poz: [y.genislik * 0.16, 2.6, 14 + y.genislik * 0.6], hedef: [0, 1.6, 0] }),
    },
    {
        baslik: L('Normalizasyon', 'Normalization'),
        sure: 7,
        vuruslar: v => [
            { t: 0, metin: L(`Bundan sonra son parçayı, ${P(v.tokenler[v.odak])} parçasını izleyeceğiz; tahmin onun sütunundan çıkacak.`,
                `From now on we follow the last token, ${P(v.tokenler[v.odak])}; the prediction will come out of its column.`) },
            { t: 2, metin: L(`Vektör önce ölçeklenir: ortalaması (μ = ${kucukSay(v.ln.mu)}) çıkarılır, standart sapmasına (σ = ${kucukSay(v.ln.sd)}) bölünür; sonra öğrenilmiş γ ile çarpılıp β eklenir.`,
                `First the vector is rescaled: its mean (μ = ${kucukSay(v.ln.mu)}) is subtracted and it is divided by its standard deviation (σ = ${kucukSay(v.ln.sd)}); then it is multiplied by the learned γ and β is added.`) },
            { t: 4.4, metin: L(`Böylece her katman benzer büyüklükte sayılarla çalışır; eğitim kararlı kalır.`,
                `This way every layer works with numbers of similar size, and training stays stable.`) },
        ],
        kamera: y => ({ poz: [y.x(y.n - 1) - 4.6, 3.2, 17], hedef: [y.x(y.n - 1) - 1.2, 1.9, 0] }),
    },
    {
        baslik: L('Dikkat', 'Attention'),
        sure: 9,
        vuruslar: (v, d) => {
            let s = v.dikkat[d.katman][d.bas];
            let en = s.map((p, j) => ({ p, j })).filter(e => e.j !== v.odak).sort((a, b) => b.p - a.p)[0];
            return [
                { t: 0, metin: L(`Şimdi tek adımda parçalar birbirine "bakar". ${P(v.tokenler[v.odak])} bir soru (Q) sorar, önceki her parça bir anahtar (K) gösterir.`,
                `Now, in a single step, tokens "look" at each other. ${P(v.tokenler[v.odak])} asks a question (Q), and every earlier token shows a key (K).`) },
                { t: 3, metin: L(`Soru ile anahtarların benzerliği yüzdeye çevrilir. Yayların kalınlığı dikkat payı: ${d.katman + 1}. blok, ${d.bas + 1}. başta en çok ${en ? `${P(v.tokenler[en.j])} (${yuzde(en.p)})` : 'kendisine'}.`,
                `The similarity between the question and the keys becomes a percentage. Arc thickness is the attention share: in block ${d.katman + 1}, head ${d.bas + 1}, the most goes to ${en ? `${P(v.tokenler[en.j])} (${yuzde(en.p)})` : 'itself'}.`) },
                { t: 6.2, metin: L(`Her blokta ${v.H} baş var; her biri farklı bir ilişkiye bakar. Sağ üstten blok ve baş değiştirip deneyin.`,
                `Each block has ${v.H} heads; each looks for a different relationship. Change the block and head at the top right and try.`) },
            ];
        },
        kamera: y => ({ poz: [0, 7.6, 14 + y.genislik * 0.58], hedef: [0, 5.2, 0] }),
    },
    {
        baslik: L('Bilgi akışı', 'Information flow'),
        sure: 7,
        vuruslar: v => [
            { t: 0, metin: L(`Dikkat payları kadar bilgi (değer vektörleri, V) önceki parçalardan ${P(v.tokenler[v.odak])} sütununa akar.`,
                `Information (value vectors, V) flows from earlier tokens into the ${P(v.tokenler[v.odak])} column, in proportion to the attention shares.`) },
            { t: 3.2, metin: L(`Gelen bilgi sütuna eklenir: x + dikkat. Bu "artık yol" sayesinde her adım eskisinin üstüne ekler; önceki bilgi silinmez.`,
                `The incoming information is added to the column: x + attention. Thanks to this "residual stream" every step writes on top of the previous one instead of erasing it.`) },
        ],
        kamera: y => ({ poz: [y.x(y.n - 1) * 0.08, 6.4, 15 + y.genislik * 0.56], hedef: [y.x(y.n - 1) * 0.12, 3.4, 0] }),
    },
    {
        baslik: L('MLP', 'MLP'),
        sure: 8,
        vuruslar: v => [
            { t: 0, metin: L(`Sonra her sütun tek başına küçük bir sinir ağından (MLP) geçer: ${v.C} sayı ${(4 * v.C).toLocaleString(YEREL)} nörona açılır.`,
                `Then each column passes, on its own, through a small neural network (MLP): ${v.C} numbers expand to ${say0(4 * v.C)} neurons.`) },
            { t: 2.6, metin: L(`Nöronlar GELU ile yanar ya da söner: bu sütunda nöronların ${yuzde(v.etkinOran, 0)} kadarı belirgin biçimde etkin. Modelin bilgisinin çoğu burada saklı.`,
                `Neurons light up or go dark through GELU: in this column about ${yuzde(v.etkinOran, 0)} of the neurons are clearly active. Most of the model's knowledge lives here.`) },
            { t: 5.2, metin: L(`Sonuç yeniden ${v.C} sayıya iner ve yine sütuna eklenir. Bu, bir Transformer bloğunun sonu.`,
                `The result shrinks back to ${v.C} numbers and is again added to the column. This is the end of one Transformer block.`) },
        ],
        kamera: y => ({ poz: [y.noronX - 0.6, 2.4, 18], hedef: [y.noronX, 1.2, 0] }),
    },
    {
        baslik: L('12 blok', '12 blocks'),
        sure: 9,
        vuruslar: v => [
            { t: 0, metin: L(`Aynı blok ${v.L} kez art arda tekrarlanır; her biri kendi ağırlıklarıyla dikkat ve MLP uygular.`,
                `The same block is repeated ${v.L} times in a row; each one applies attention and MLP with its own weights.`) },
            { t: 2.5, metin: L(`Her bloktan sonra modelin o anki tahminine bakabiliriz ("logit merceği", sağdaki etiketler): ilk bloklarda bulanık ve ilgisiz, sona doğru netleşir. [metin sonu] özel bir parçadır: "burada metin bitebilir" demek.`,
                `After each block we can peek at the model's current guess (the "logit lens", labels on the right): blurry and off-topic in early blocks, sharper towards the end. [end of text] is a special token meaning "the text could end here".`) },
        ],
        kamera: y => ({ poz: [3, y.kuleUst - 7.2, 35], hedef: [0, y.kuleUst - 8.6, 0] }),
    },
    {
        baslik: L('Olasılıklar', 'Probabilities'),
        sure: 8,
        vuruslar: v => [
            { t: 0, metin: L(`Son vektör sözlükteki ${v.V.toLocaleString(YEREL)} parçanın her biri için bir ham puana (logit) çevrilir. En yüksek 24'ü:`,
                `The last vector is turned into a raw score (logit) for each of the ${say0(v.V)} tokens in the vocabulary. The top 24:`) },
            { t: 3, metin: L(`Softmax puanları olasılığa çevirir: üstelini al, toplama böl. Küçük puan farkları büyük olasılık farkına dönüşür.`,
                `Softmax turns the scores into probabilities: exponentiate, divide by the total. Small score gaps become large probability gaps.`) },
        ],
        kamera: y => ({ poz: [-1.5, y.cubukY + 3.8, 17 + y.genislik * 0.5], hedef: [-1.8, y.cubukY + 2.6, 0] }),
    },
    {
        baslik: L('Seçim', 'Choice'),
        sure: 6,
        vuruslar: v => [
            { t: 0, metin: L(`En olası parça ${P(v.olasiliklar[0]?.metin ?? '')} (${yuzde(v.olasiliklar[0]?.p ?? 0)}). Seçilen parça cümleye eklenir ve bütün hesap baştan yapılır: metin böyle parça parça üretilir.`,
                `The most likely token is ${P(v.olasiliklar[0]?.metin ?? '')} (${yuzde(v.olasiliklar[0]?.p ?? 0)}). The chosen token is appended to the sentence and the whole computation starts again: this is how text is generated, token by token.`) },
            { t: 3, metin: L(`Sağ üstteki panelde bir tahmine tıklayıp cümleyi uzatabilir ya da kendi cümlenizi yazabilirsiniz.`,
                `In the panel at the top right you can click a prediction to extend the sentence, or type your own.`) },
        ],
        kamera: y => ({ poz: [-1, y.cubukY + 5.4, 17 + y.genislik * 0.5], hedef: [-1.2, y.cubukY + 4.2, 0] }),
    },
];

// ---------- saat ----------

export interface IDurum {
    adim: number;
    t: number;
    oynuyor: boolean;
    hiz: number;
    otomatik: boolean;
    dikkat: { katman: number; bas: number };
    kameraSayac: number;   // kamerayı adımın görünümüne döndürme isteği
    sicaklik: number;      // ayrıntılı görünümün son adımı (softmax sıcaklığı)
}

type Dinleyici = () => void;

export class Saat {
    durum: IDurum = { adim: 0, t: 0, oynuyor: true, hiz: 1, otomatik: false, dikkat: { katman: 0, bas: 0 }, kameraSayac: 0, sicaklik: 1 };
    // TR: anlatım ve ayrıntılı görünüm aynı saati kendi adım listeleriyle kullanır
    constructor(public adimlar: { sure: number }[] = ADIMLAR) { }
    private dinleyiciler = new Set<Dinleyici>();
    private anlik: IDurum = { ...this.durum };
    private sonBildirim = 0;

    abone = (f: Dinleyici) => { this.dinleyiciler.add(f); return () => { this.dinleyiciler.delete(f); }; };
    oku = () => this.anlik;
    private bildir() { this.anlik = { ...this.durum }; this.dinleyiciler.forEach(f => f()); }

    ilerlet(dt: number) {
        let d = this.durum;
        if (!d.oynuyor) return;
        let sure = this.adimlar[d.adim].sure;
        d.t = Math.min(sure, d.t + dt * d.hiz);
        let simdi = performance.now();
        if (d.t >= sure) {
            if (d.otomatik && d.adim < this.adimlar.length - 1) { d.adim++; d.t = 0; }
            else d.oynuyor = false;
            this.bildir();
        } else if (simdi - this.sonBildirim > 90) {
            this.sonBildirim = simdi;
            this.bildir();
        }
    }
    adimaGit(k: number) {
        let d = this.durum;
        d.adim = Math.max(0, Math.min(this.adimlar.length - 1, k)); d.t = 0; d.oynuyor = true;
        this.bildir();
    }
    ileri() {
        let d = this.durum;
        if (d.t < this.adimlar[d.adim].sure - 0.05) { d.t = this.adimlar[d.adim].sure; d.oynuyor = false; this.bildir(); }
        else if (d.adim < this.adimlar.length - 1) this.adimaGit(d.adim + 1);
    }
    geri() { this.adimaGit(this.durum.t > 1.2 ? this.durum.adim : this.durum.adim - 1); }
    oynatDuraklat() {
        let d = this.durum;
        if (!d.oynuyor && d.t >= this.adimlar[d.adim].sure - 0.05) { this.ileri(); return; }
        d.oynuyor = !d.oynuyor; this.bildir();
    }
    ayarla(p: Partial<IDurum>) { Object.assign(this.durum, p); this.bildir(); }
    kamerayiSifirla() { this.durum.kameraSayac++; this.bildir(); }
}

// Animasyon yardımcıları
export const sinir = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const yumusak = (x: number) => { x = sinir(x); return x * x * (3 - 2 * x); };
// adım k'nin [a, b] saniyeleri arasında 0→1; daha sonraki adımlarda 1, öncekilerde 0
export function ara(d: { adim: number; t: number }, k: number, a: number, b: number) {
    if (d.adim > k) return 1;
    if (d.adim < k) return 0;
    return yumusak((d.t - a) / Math.max(1e-6, b - a));
}
