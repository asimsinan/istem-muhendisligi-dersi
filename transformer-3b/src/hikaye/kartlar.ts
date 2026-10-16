// TR: Anlatımın bilgi kartları ve terim sözlüğü. Her adımdan önce "ASY" (kendi çizdiğimiz robot rehber) bir
// benzetmeyle konuyu anlatır, oyuncak sayılarla tek bir örnek hesap gösterir ve ekranda ne izleneceğini söyler.
// Oyuncak örnekler bilerek küçük (3 sayılık vektörler); hemen ardından animasyon aynı işlemi modelin gerçek sayılarıyla yapar.
import { IHikayeVeri, okunur, say, yuzde } from './veri';
import { EN } from '../llm/tr/dil';
import { IAyrintiVeri, GC, GV } from '../ayrinti/veri';
import { enBuyukJ } from '../ayrinti/akis';

export interface ITerim { ad: string; kisa: string }

// Sözlük: altyazıda geçen terimlerin üstüne gelince açılan tek satırlık açıklamalar
export const terimAdi = (k: string) => k === 'mlp' || k === 'gelu' ? k.toUpperCase() : k;

const SOZLUK_TR: Record<string, string> = {
    'dil modeli': 'Bir metnin devamında hangi parçanın gelebileceğini olasılıkla tahmin eden program.',
    'token': 'Parça: modelin okuduğu en küçük birim; bir kelime, kelimenin bir kısmı ya da bir işaret.',
    'sözlük': 'Modelin tanıdığı bütün parçaların numaralı listesi (Türkçe GPT-2: 50.257 parça).',
    'gömme': 'Bir parçanın sayılarla yazılmış kimlik kartı: 768 sayılık vektör. Eğitimde öğrenilir.',
    'vektör': 'Sıralı bir sayı listesi, örneğin [0,9 · 0,8 · 0,1]. Model her şeyi vektörlerle temsil eder.',
    'konum gömmesi': 'Parçanın cümledeki sırasını anlatan ikinci vektör; kelime vektörüne eklenir.',
    'katman normu': 'Vektörün ortalamasını 0, yayılımını 1 yapar: herkesin sesini aynı seviyeye getirir.',
    'ortalama': 'Sayıların toplamı bölü sayıları: μ.',
    'standart sapma': 'Sayıların ortalamadan ne kadar uzağa yayıldığı: σ.',
    'dikkat': 'Her parçanın önceki parçalardan hangisine ne kadar bakacağını hesaplayan adım.',
    'sorgu': 'Q: parçanın sorduğu soru ("ben kimi arıyorum?").',
    'anahtar': 'K: parçanın gösterdiği etiket ("ben şuyum").',
    'değer': 'V: parçanın paylaştığı bilgi; dikkat payı kadar aktarılır.',
    'nokta çarpım': 'İki vektörün sayılarını eş eş çarpıp toplamak; ne kadar benzer olduklarının ölçüsü.',
    'softmax': 'Puanları olasılığa çevirir: her puanın üstelini (eˣ) al, hepsinin toplamına böl.',
    'baş': 'Dikkatin paralel bir kopyası; her blokta 12 baş farklı ilişkilere bakar.',
    'ağırlıklı toplam': 'Her değeri kendi payıyla çarpıp toplamak: %95·A + %5·B.',
    'artık bağlantı': 'Yeni bilgiyi eskisinin üstüne eklemek (x + yeni): hiçbir şey silinmez.',
    'artık yol': 'Artık bağlantı: yeni bilgi eskisinin üstüne eklenir (x + yeni).',
    'mlp': 'Çok katmanlı algılayıcı: 768 → 3.072 → 768 nöronluk küçük sinir ağı; bilginin çoğu burada.',
    'nöron': 'Gelen sayıları ağırlıklarıyla çarpıp toplayan, sonra GELU\'dan geçiren küçük hesap birimi.',
    'gelu': 'Işık kısma düğmesi gibi bir fonksiyon: olumsuz değerleri neredeyse söndürür, olumluları geçirir.',
    'blok': 'Bir dikkat + bir MLP adımı. GPT-2 küçük modelde 12 blok üst üste.',
    'logit merceği': 'Ara bir bloğun vektörünü doğrudan çıktı katmanına verip "şu an ne tahmin ediyor?" diye bakmak.',
    'logit': 'Softmax öncesi ham puan; büyük olan daha olası.',
    'olasılık': '0 ile 1 arası pay; bütün parçaların olasılıkları toplamı 1.',
    'ağırlık': 'Eğitimde öğrenilmiş sayı; model çalışırken değişmez.',
    'sıcaklık': 'Seçimin cesaret düğmesi: düşükse hep en olası parça, yüksekse sürprizli seçimler.',
    'örnekleme': 'Olasılıklara göre zar atarak parça seçmek.',
    'matris': 'Satır ve sütunlardan oluşan sayı tablosu. Burada her satır bir parça.',
    'maske': 'Bir parçanın kendinden sonra gelenleri görmesini engelleyen −∞ değerler.',
    'izdüşüm': 'Bir vektörü bir ağırlık matrisiyle çarpıp başka bir boyuta/uzaya taşımak (ör. W_O).',
};

// Altyazıda aranacak terimler (uzun olan önce): ekler serbest, terimin başı kelime başında olmalı
// İngilizce sözlük (İngilizce sürümde altyazılar ve kartlar bunu kullanır)
const SOZLUK_EN: Record<string, string> = {
    'language model': 'A program that predicts, with probabilities, which token could come next in a text.',
    'token': 'The smallest unit the model reads: a word, part of a word, or a punctuation mark.',
    'vocabulary': 'The numbered list of every token the model knows (GPT-2: 50,257 tokens).',
    'embedding': 'A token\'s ID card written in numbers: a 768-number vector. Learned during training.',
    'vector': 'An ordered list of numbers, e.g. [0.9 · 0.8 · 0.1]. The model represents everything with vectors.',
    'position embedding': 'A second vector that encodes the token\'s position in the sentence; added to the word vector.',
    'layer norm': 'Makes a vector\'s mean 0 and spread 1: brings everyone\'s voice to the same level.',
    'mean': 'The sum of the numbers divided by how many there are: μ.',
    'standard deviation': 'How far the numbers spread from the mean: σ.',
    'attention': 'The step that computes how much each token looks at each earlier token.',
    'query': 'Q: the question a token asks ("who am I looking for?").',
    'key': 'K: the label a token shows ("this is what I am").',
    'value': 'V: the information a token shares; passed on in proportion to the attention share.',
    'dot product': 'Multiply two vectors number by number and add up: a measure of how similar they are.',
    'softmax': 'Turns scores into probabilities: take eˣ of each score and divide by the total.',
    'head': 'A parallel copy of attention; in each block 12 heads look at different relationships.',
    'weighted sum': 'Multiply each value by its share and add up: 95%·A + 5%·B.',
    'residual connection': 'Adding new information on top of the old (x + new): nothing is erased.',
    'residual stream': 'The residual connection: new information is added on top of the old (x + new).',
    'mlp': 'Multi-layer perceptron: a small 768 → 3,072 → 768 neural network; most of the knowledge lives here.',
    'neuron': 'A small unit that multiplies its inputs by weights, adds them up, then passes the sum through GELU.',
    'gelu': 'A dimmer-switch function: it nearly turns off negative values and lets positive ones through.',
    'block': 'One attention + one MLP step. Small GPT-2 stacks 12 blocks.',
    'logit lens': 'Feeding an intermediate block\'s vector straight to the output layer to ask "what would it predict now?"',
    'logit': 'A raw score before softmax; larger means more likely.',
    'probability': 'A share between 0 and 1; the probabilities of all tokens add up to 1.',
    'weight': 'A number learned in training; it does not change while the model runs.',
    'temperature': 'The courage knob of the choice: low means always the most likely token, high means surprising choices.',
    'sampling': 'Choosing a token by rolling dice weighted by the probabilities.',
    'matrix': 'A table of numbers made of rows and columns. Here each row is a token.',
    'mask': 'The −∞ values that stop a token from seeing the tokens after it.',
    'projection': 'Multiplying a vector by a weight matrix to carry it into another space (e.g. W_O).',
};

export const SOZLUK = EN ? SOZLUK_EN : SOZLUK_TR;
// altyazıda çok anlamlı (başta, baştan / meaning): yalnızca kartta
const YALNIZ_KART = new Set(EN ? ['mean', 'key', 'head', 'value', 'weight'] : ['baş']);
const ARANAN = Object.keys(SOZLUK).filter(k => !YALNIZ_KART.has(k)).sort((a, b) => b.length - a.length);
const harf = /[a-zçğıöşüâîû0-9]/i;

export type Parca = string | { terim: string; anahtar: string };

export function terimleriIsaretle(metin: string): Parca[] {
    let kucuk = metin.toLocaleLowerCase(EN ? 'en-US' : 'tr-TR');
    let bulunan: { i: number; n: number; k: string }[] = [];
    let kullanilan = new Set<string>();
    for (let k of ARANAN) {
        if (kullanilan.has(SOZLUK[k])) continue;
        let i = -1;
        while ((i = kucuk.indexOf(k, i + 1)) >= 0) {
            if (i > 0 && harf.test(kucuk[i - 1])) continue;
            if (bulunan.some(b => i < b.i + b.n && b.i < i + k.length)) continue;
            bulunan.push({ i, n: k.length, k }); kullanilan.add(SOZLUK[k]);
            break;
        }
    }
    bulunan.sort((a, b) => a.i - b.i);
    let sonuc: Parca[] = [], j = 0;
    for (let b of bulunan) {
        if (b.i > j) sonuc.push(metin.slice(j, b.i));
        sonuc.push({ terim: metin.slice(b.i, b.i + b.n), anahtar: b.k });
        j = b.i + b.n;
    }
    if (j < metin.length) sonuc.push(metin.slice(j));
    return sonuc;
}

export interface IKart {
    baslik: string;
    hikaye: string;          // ASY'nin (rehber robot) anlatımı (benzetme)
    ornekBaslik: string;
    ornek: string[];         // oyuncak hesap, satır satır (eşit aralıklı yazı)
    ornekNot?: string;
    ekranda: string;         // animasyonda neye bakılacak
    terimler: string[];      // SOZLUK anahtarları
}

const Q = (t: string) => `"${t.trim() || okunur(t)}"`;

function kartlarTR(v: IHikayeVeri): IKart[] {
    let kahraman = Q(v.tokenler[v.odak]);
    let cumle = v.tokenler.join('');
    let ornekI = Math.min(1, v.n - 1);
    let en = v.olasiliklar[0];
    return [
        {
            baslik: 'Yolculuk başlıyor',
            hikaye: `Merhaba, ben ASY! Seni bir dil modelinin içinde gezdireceğim. Bu model, telefon klavyendeki kelime önerisinin çok büyük bir kardeşi: tek bir işi var, cümlenin devamını tahmin etmek. Kahramanımız cümlenin son parçası ${kahraman}. Sıradaki parçayı bulmak için 12 kattan geçecek; biz de onu izleyeceğiz.`,
            ornekBaslik: 'Tanıdık bir örnek',
            ornek: ['"Yarın görüşmek …"', '  klavye önerir → "üzere"', '', `"${cumle.trim()} …"`, '  model önerecek → ?'],
            ekranda: `Cümlemiz ekranda beliriyor. Son parça ${kahraman} kırmızı çerçeveli: tahmin onun için yapılacak.`,
            terimler: ['dil modeli', 'token'],
        },
        {
            baslik: 'Yapboz parçaları',
            hikaye: 'Model harfleri ya da kelimeleri okuyamaz, yalnızca sayılarla çalışır. Bu yüzden metni önce yapboz parçalarına (token) ayırır. Sık kullanılan kelimeler tek parça olur; nadir kelimeler bölünür.',
            ornekBaslik: 'Bölme ve numaralama',
            ornek: [`"${cumle.trim()}"`, `→ ${v.tokenler.map(x => okunur(x)).join(' | ')}`, '', `${Q(v.tokenler[ornekI])} → sözlükte #${v.ids[ornekI]}`],
            ornekNot: `Sözlükte ${v.V.toLocaleString('tr-TR')} parça var; model yalnızca numaraları görür.`,
            ekranda: `Kutular ${v.n} parça; altlarındaki sayılar sözlük numaraları.`,
            terimler: ['token', 'sözlük'],
        },
        {
            baslik: 'Kimlik kartları',
            hikaye: `Tek bir numara anlam taşımaz. Bu yüzden her parçaya ${v.C} sayılık bir kimlik kartı verilir: gömme vektörü. Eğitim sırasında benzer yerlerde kullanılan kelimelerin kartları birbirine benzemeye başlar. Karta bir de sıra numarası eklenir, çünkü "Ali Ayşe'yi gördü" ile "Ayşe Ali'yi gördü" aynı kelimelerdir ama anlamları farklıdır.`,
            ornekBaslik: 'Oyuncak örnek: 3 sayılık kartlar',
            ornek: ['kedi  = [ 0,9  0,8  0,1 ]', 'köpek = [ 0,8  0,9  0,1 ]   ← kediye benziyor', 'masa  = [ 0,1  0,0  0,9 ]   ← farklı', '', 'kelime kartı + konum kartı = parçanın vektörü'],
            ekranda: `Mavi-turuncu şeritler öğrenilmiş tablolardan gelen iki kart. Toplanınca yeşil-pembe şerit olur: modelin işleyeceği ${v.C} sayı.`,
            terimler: ['gömme', 'vektör', 'konum gömmesi', 'ağırlık'],
        },
        {
            baslik: 'Sesleri eşitlemek',
            hikaye: 'Bir toplantıda biri bağırıyor, biri fısıldıyorsa kimse kimseyi duyamaz. Katman normu her vektörün "sesini" aynı seviyeye getirir: ortalamayı çıkarır, yayılıma böler. Böylece sonraki hesaplar ne çok büyük ne çok küçük sayılarla boğuşur.',
            ornekBaslik: 'Oyuncak örnek',
            ornek: ['x            = [ 2   4   6 ]', 'ortalama μ   = 4', 'x − μ        = [−2   0   2 ]', 'σ ≈ 1,63  →  [−1,22  0  1,22 ]'],
            ekranda: `${kahraman} sütunu için gerçek değerler: μ = ${say(v.ln.mu, 3)}, σ = ${say(v.ln.sd, 3)}.`,
            terimler: ['katman normu', 'ortalama', 'standart sapma'],
        },
        {
            baslik: 'Kime bakmalı?',
            hikaye: `${kahraman} kendine soruyor: "Ben kimden bahsediyorum?" Elinde bir soru kartı (sorgu, Q) var. Önceki her parça da bir etiket gösteriyor (anahtar, K). Soru ile etiket ne kadar örtüşürse o parçaya o kadar dikkat eder. Örtüşmeyi nokta çarpım ölçer: sayıları eş eş çarp, topla.`,
            ornekBaslik: 'Oyuncak örnek: nokta çarpım + softmax',
            ornek: ['soru Q            = [ 2  1  0 ]', '"Ayşe" anahtarı   = [ 2  0  1 ]  → 2·2 + 1·0 + 0·1 = 4', '"kitabı" anahtarı = [ 0  1  3 ]  → 2·0 + 1·1 + 0·3 = 1', '', 'softmax(4, 1) → Ayşe %95 · kitabı %5'],
            ornekNot: 'Gerçekte vektörler 64 sayılık ve puan √64 = 8\'e bölünür.',
            ekranda: `Yayların kalınlığı dikkat payı. Her blokta ${v.H} baş var: ${v.H} ayrı dedektif, her biri başka bir ipucuna bakar. Sağ üstten blok ve baş değiştirebilirsin.`,
            terimler: ['dikkat', 'sorgu', 'anahtar', 'nokta çarpım', 'softmax', 'baş'],
        },
        {
            baslik: 'Bilgi taşınıyor',
            hikaye: `Dikkat kime bakılacağını seçti; şimdi bilgi taşınıyor. Her parça paylaşacağı bilgiyi bir değer vektöründe (V) taşır. ${kahraman} bir parçaya %95 baktıysa o parçanın bilgisinin %95'ini alır. Gelen bilgi eskisinin üstüne eklenir: not defterine yeni satır yazmak gibi, eski notlar silinmez.`,
            ornekBaslik: 'Oyuncak örnek: ağırlıklı toplam',
            ornek: ['"Ayşe" değeri   = [ 1  0 ]', '"kitabı" değeri = [ 0  1 ]', '0,95·[1 0] + 0,05·[0 1] = [ 0,95  0,05 ]', '', 'yeni x = eski x + [ 0,95  0,05 ]'],
            ekranda: 'Parçacıklar değer vektörlerinin akışı. Sonra sütuna eklenir: bu toplamaya artık bağlantı denir.',
            terimler: ['değer', 'ağırlıklı toplam', 'artık bağlantı'],
        },
        {
            baslik: 'Kendi kendine düşünmek',
            hikaye: `Parçalar birbiriyle konuştu; şimdi her parça kendi başına "düşünüyor". MLP, modelin eğitimde öğrendiği bilgilerin çoğunun saklandığı yer. ${v.C} sayı ${(4 * v.C).toLocaleString('tr-TR')} nörona açılır; her nöron bir özellik dedektörü gibidir. GELU ise ışık kısma düğmesi: zayıf ya da olumsuz sinyali söndürür, güçlü sinyali geçirir.`,
            ornekBaslik: 'GELU ışık kısma düğmesi',
            ornek: ['girdi  −2   →  −0,05   (neredeyse söner)', 'girdi   0   →   0', 'girdi  0,5  →   0,35   (kısık)', 'girdi   2   →   1,95   (geçer)'],
            ekranda: `Yanan nöronlar ${kahraman} için etkin özellikler; bu sütunda nöronların ${yuzde(v.etkinOran, 0)} kadarı belirgin etkin. Sonra yine ${v.C} sayıya iner ve sütuna eklenir.`,
            terimler: ['mlp', 'nöron', 'gelu'],
        },
        {
            baslik: '12 kat',
            hikaye: `Zor bir metni bir kez okuyup anlamayız; tekrar tekrar okuruz. Model de dikkat + MLP bloğunu ${v.L} kez üst üste uygular; her katın kendi ağırlıkları var. Araştırmalar ilk katların daha çok dilbilgisine (ekler, kelime türü), sonraki katların anlama ve tahmine yönelme eğiliminde olduğunu gösteriyor.`,
            ornekBaslik: 'Okumaya benzetirsek',
            ornek: ['1. okuma  → kelimeler ve ekler', '4. okuma  → kim kime ne yaptı', '8. okuma  → "o" kimi kastediyor', '12. okuma → sıradaki parça ne olmalı'],
            ornekNot: 'Bu bir benzetme; katların görev dağılımı her modelde kesin çizgilerle ayrılmaz.',
            ekranda: 'Her bloktan sonra modelin o anki tahminine bakıyoruz (logit merceği): ilk bloklarda bulanık, sona doğru netleşiyor.',
            terimler: ['blok', 'logit merceği'],
        },
        {
            baslik: 'Puanlar olasılığa',
            hikaye: `Yolculuğun sonu: ${kahraman} sütunundaki son vektör, sözlükteki ${v.V.toLocaleString('tr-TR')} parçanın her biriyle karşılaştırılır (yine nokta çarpım). Her parça bir ham puan alır: logit. Softmax bu puanları toplamı %100 olan paylara çevirir.`,
            ornekBaslik: 'Oyuncak örnek: softmax',
            ornek: ['logitler     = [ 3     2     0   ]', 'eˣ           = [ 20,1  7,4   1,0 ]', 'toplam       = 28,5', 'olasılık     = [ %70,6 %26,0 %3,5 ]'],
            ornekNot: 'Üstel alınınca küçük puan farkları büyük olasılık farkına dönüşür.',
            ekranda: 'Çubuklar en olası 24 parçanın olasılıkları.',
            terimler: ['logit', 'softmax', 'olasılık'],
        },
        {
            baslik: 'Bir parça seçildi',
            hikaye: 'Model en olası parçayı seçer (ya da olasılıklara göre zar atar), cümleye ekler ve bütün yolculuk yeni cümleyle baştan başlar. Sohbet botları da cevaplarını böyle, parça parça yazar.',
            ornekBaslik: 'Bu cümlede',
            ornek: en ? [`en olası parça → ${Q(en.metin)}  (${yuzde(en.p)})`, '', `"${cumle.trim()}" + ${Q(en.metin)}`, '→ yeni cümle, yeni yolculuk'] : [],
            ornekNot: 'Sıcaklık ayarı zarın ne kadar cesur atılacağını belirler (Ayrıntılı görünümün son adımı).',
            ekranda: 'Sağ paneldeki tahminlere tıklayıp cümleyi uzatabilir ya da kendi cümleni yazabilirsin.',
            terimler: ['örnekleme', 'sıcaklık'],
        },
    ];
}

// İngilizce kartlar (özgün OpenAI GPT-2 ile; örnek cümle: "Alice gave the book to Mary because she")
function kartlarEN(v: IHikayeVeri): IKart[] {
    let hero = Q(v.tokenler[v.odak]);
    let cumle = v.tokenler.join('');
    let ornekI = Math.min(1, v.n - 1);
    let en = v.olasiliklar[0];
    return [
        {
            baslik: 'The journey begins',
            hikaye: `Hi, I'm ASY! I'll show you around the inside of a language model. This model is a much bigger sibling of the word suggestions on your phone keyboard: it has one job, to predict how a sentence continues. Our hero is the last token of the sentence, ${hero}. It will pass through 12 floors to find the next token, and we'll follow it.`,
            ornekBaslik: 'A familiar example',
            ornek: ['"See you …"', '  keyboard suggests → "tomorrow"', '', `"${cumle.trim()} …"`, '  the model will suggest → ?'],
            ekranda: `Our sentence appears on screen. The last token ${hero} has a red frame: the prediction is made for it.`,
            terimler: ['language model', 'token'],
        },
        {
            baslik: 'Puzzle pieces',
            hikaye: 'The model cannot read letters or words; it only works with numbers. So it first cuts the text into puzzle pieces (tokens). Common words become a single piece; rare words are split up.',
            ornekBaslik: 'Splitting and numbering',
            ornek: [`"${cumle.trim()}"`, `→ ${v.tokenler.map(x => okunur(x)).join(' | ')}`, '', `${Q(v.tokenler[ornekI])} → #${v.ids[ornekI]} in the vocabulary`],
            ornekNot: `The vocabulary has ${v.V.toLocaleString('en-US')} tokens; the model only sees the numbers.`,
            ekranda: `The boxes are the ${v.n} tokens; the numbers under them are their vocabulary IDs.`,
            terimler: ['token', 'vocabulary'],
        },
        {
            baslik: 'ID cards',
            hikaye: `A single number carries no meaning. So each token gets a ${v.C}-number ID card: its embedding vector. During training, the cards of words used in similar places start to look alike. A position number is added to the card too, because "Alice saw Mary" and "Mary saw Alice" have the same words but different meanings.`,
            ornekBaslik: 'Toy example: 3-number cards',
            ornek: ['cat   = [ 0.9  0.8  0.1 ]', 'dog   = [ 0.8  0.9  0.1 ]   ← similar to cat', 'table = [ 0.1  0.0  0.9 ]   ← different', '', 'word card + position card = the token\'s vector'],
            ekranda: `The blue-orange strips are the two cards from the learned tables. Added together they become a green-pink strip: the ${v.C} numbers the model will process.`,
            terimler: ['embedding', 'vector', 'position embedding', 'weight'],
        },
        {
            baslik: 'Leveling the voices',
            hikaye: 'If one person in a meeting shouts and another whispers, nobody can hear anybody. Layer norm brings the "voice" of every vector to the same level: it subtracts the mean and divides by the spread. That way later computations never have to wrestle with numbers that are far too big or far too small.',
            ornekBaslik: 'Toy example',
            ornek: ['x            = [ 2   4   6 ]', 'mean μ       = 4', 'x − μ        = [−2   0   2 ]', 'σ ≈ 1.63  →  [−1.22  0  1.22 ]'],
            ekranda: `Real values for the ${hero} column: μ = ${say(v.ln.mu, 3)}, σ = ${say(v.ln.sd, 3)}.`,
            terimler: ['layer norm', 'mean', 'standard deviation'],
        },
        {
            baslik: 'Who to look at?',
            hikaye: `${hero} asks itself: "Who am I talking about?" It holds a question card (query, Q). Every earlier token shows a label (key, K). The better the question matches a label, the more attention it pays to that token. The match is measured with a dot product: multiply number by number, then add.`,
            ornekBaslik: 'Toy example: dot product + softmax',
            ornek: ['query Q         = [ 2  1  0 ]', '"Mary" key      = [ 2  0  1 ]  → 2·2 + 1·0 + 0·1 = 4', '"book" key      = [ 0  1  3 ]  → 2·0 + 1·1 + 0·3 = 1', '', 'softmax(4, 1) → Mary 95% · book 5%'],
            ornekNot: 'In reality the vectors have 64 numbers and the score is divided by √64 = 8.',
            ekranda: `Arc thickness is the attention share. Each block has ${v.H} heads: ${v.H} separate detectives, each following a different clue. You can change the block and head at the top right.`,
            terimler: ['attention', 'query', 'key', 'dot product', 'softmax', 'head'],
        },
        {
            baslik: 'Information moves',
            hikaye: `Attention decided who to look at; now information moves. Each token carries the information it will share in a value vector (V). If ${hero} looks 95% at a token, it receives 95% of that token's information. The incoming information is added on top of the old: like writing a new line in a notebook, the old notes are not erased.`,
            ornekBaslik: 'Toy example: weighted sum',
            ornek: ['"Mary" value    = [ 1  0 ]', '"book" value    = [ 0  1 ]', '0.95·[1 0] + 0.05·[0 1] = [ 0.95  0.05 ]', '', 'new x = old x + [ 0.95  0.05 ]'],
            ekranda: 'The particles are the value vectors flowing. Then they are added to the column: this addition is called the residual connection.',
            terimler: ['value', 'weighted sum', 'residual connection'],
        },
        {
            baslik: 'Thinking alone',
            hikaye: `The tokens have talked to each other; now each token "thinks" on its own. The MLP is where most of what the model learned in training is stored. ${v.C} numbers expand to ${(4 * v.C).toLocaleString('en-US')} neurons; each neuron is like a feature detector. GELU is a dimmer switch: it turns weak or negative signals off and lets strong ones through.`,
            ornekBaslik: 'GELU, the dimmer switch',
            ornek: ['input  −2   →  −0.05   (almost off)', 'input   0   →   0', 'input  0.5  →   0.35   (dimmed)', 'input   2   →   1.95   (passes)'],
            ekranda: `The glowing neurons are the active features for ${hero}; in this column about ${yuzde(v.etkinOran, 0)} of the neurons are clearly active. Then it shrinks back to ${v.C} numbers and is added to the column.`,
            terimler: ['mlp', 'neuron', 'gelu'],
        },
        {
            baslik: '12 floors',
            hikaye: `We rarely understand a hard text on the first read; we read it again and again. The model also applies the attention + MLP block ${v.L} times in a row; each floor has its own weights. Research suggests that early layers tend to focus more on grammar (word forms, parts of speech) and later layers more on meaning and prediction.`,
            ornekBaslik: 'If it were reading',
            ornek: ['read 1  → words and word forms', 'read 4  → who did what to whom', 'read 8  → who "she" refers to', 'read 12 → what the next token should be'],
            ornekNot: 'This is an analogy; the division of labor between layers is never perfectly clean.',
            ekranda: 'After each block we peek at the model\'s current guess (logit lens): blurry in early blocks, sharper towards the end.',
            terimler: ['block', 'logit lens'],
        },
        {
            baslik: 'Scores into probabilities',
            hikaye: `The end of the journey: the final vector in the ${hero} column is compared with each of the ${v.V.toLocaleString('en-US')} tokens in the vocabulary (a dot product again). Each token gets a raw score: a logit. Softmax turns these scores into shares that add up to 100%.`,
            ornekBaslik: 'Toy example: softmax',
            ornek: ['logits       = [ 3     2     0   ]', 'eˣ           = [ 20.1  7.4   1.0 ]', 'total        = 28.5', 'probability  = [ 70.6% 26.0% 3.5% ]'],
            ornekNot: 'Exponentiating turns small score gaps into large probability gaps.',
            ekranda: 'The bars are the probabilities of the 24 most likely tokens.',
            terimler: ['logit', 'softmax', 'probability'],
        },
        {
            baslik: 'A token is chosen',
            hikaye: 'The model picks the most likely token (or rolls dice weighted by the probabilities), appends it to the sentence, and the whole journey starts again with the new sentence. Chatbots write their answers the same way, token by token.',
            ornekBaslik: 'In this sentence',
            ornek: en ? [`most likely token → ${Q(en.metin)}  (${yuzde(en.p)})`, '', `"${cumle.trim()}" + ${Q(en.metin)}`, '→ new sentence, new journey'] : [],
            ornekNot: 'The temperature setting decides how bold the dice roll is (last step of the Detailed view).',
            ekranda: 'Click a prediction in the right panel to extend the sentence, or type your own.',
            terimler: ['sampling', 'temperature'],
        },
    ];
}

export const kartlar = (v: IHikayeVeri): IKart[] => (EN ? kartlarEN(v) : kartlarTR(v));

const ust = (n: number) => String(n).replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]);

// ---------- Ayrıntılı görünümün kartları (12 adım): Gezgin bu kez matris çarpımlarını anlatır ----------
function ayrintiTR(v: IAyrintiVeri): IKart[] {
    let son = Q(v.tokenler[v.n - 1]), j = enBuyukJ(v), kok = Math.sqrt(v.A);
    return [
        {
            baslik: 'Bloğun içine giriyoruz',
            hikaye: `Yine ben, ASY! Bu kez bir Transformer bloğunun içine giriyoruz ve her çarpımı gerçek sayılarla göreceğiz. Bloğa giren şey bir tablo, yani matris: her satır bir parça, her sütun bir kanal. ${v.n} satır × ${v.C} sütun var; ekranda ${GC} sütun gösteriliyor.`,
            ornekBaslik: 'Oyuncak örnek: 3 parça × 3 kanal',
            ornek: ['            k₀     k₁     k₂', '"Ali"    [  0,2  −1,1   0,7 ]', '"kitabı" [  1,3   0,4  −0,2 ]', '"o"      [ −0,5   0,9   1,8 ]'],
            ornekNot: 'Her satır, o parçanın bu bloğa gelirken taşıdığı vektör.',
            ekranda: `İzlediğimiz blok: ${v.katman + 1}. blok, ${v.bas + 1}. baş (üstten değiştirebilirsin). Bir hücreye gel, tam değerini oku.`,
            terimler: ['matris', 'vektör', 'blok'],
        },
        {
            baslik: 'Satır satır denge',
            hikaye: 'Her satırı ayrı ayrı dengeliyoruz: önce ortalamasını (μ) çıkar, sonra yayılımına (σ) böl. Ardından öğrenilmiş iki ayarla, γ (çarpan) ve β (kayma), yeniden ölçekle. Satırlar birbirini hiç etkilemez.',
            ornekBaslik: 'Oyuncak örnek: tek satır',
            ornek: ['satır      = [  2     4     6   ]', 'μ = 4,  σ ≈ 1,63', '(x − μ)/σ  = [ −1,22  0     1,22 ]', 'γ = 2, β = 0,5 → [ −1,95  0,5  2,95 ]'],
            ekranda: 'μ ve σ sütunları her satırın değerleri; N₁ dengelenmiş tablo.',
            terimler: ['katman normu', 'ortalama', 'standart sapma'],
        },
        {
            baslik: 'Üç kart: Q, K, V',
            hikaye: `Her satır üç ayrı ağırlık matrisiyle çarpılır ve üç yeni vektör çıkar: sorgu (Q), anahtar (K), değer (V). Matris çarpımında sonucun her hücresi, soldaki matrisin bir satırı ile sağdakinin bir sütununun nokta çarpımıdır. Her başın kendi W_Q, W_K, W_V matrisleri var.`,
            ornekBaslik: 'Oyuncak örnek: satır × matris',
            ornek: ['satır = [ 1  2 ]', 'W_Q   = [ 3  0 ]', '        [ 1  2 ]', 'satır · W_Q = [ 1·3 + 2·1   1·0 + 2·2 ] = [ 5  4 ]'],
            ornekNot: `Gerçekte satır ${v.C} sayı; her başın Q, K, V vektörü ${v.A} sayı.`,
            ekranda: 'Tarama: N₁\'in parlayan satırı × W\'nin parlayan sütunu = sonucun parlayan hücresi.',
            terimler: ['sorgu', 'anahtar', 'değer', 'nokta çarpım', 'ağırlık'],
        },
        {
            baslik: 'Puan tablosu',
            hikaye: `Şimdi her parçanın sorusu, her parçanın anahtarıyla nokta çarpılır: Q·Kᵀ. Sonuç ${v.n}×${v.n} bir tablo: satır "soran", sütun "bakılan" parça. Puanlar √${v.A} = ${kok}'e bölünür; yoksa softmax çok sivri olur ve neredeyse tek bir parçayı seçer.`,
            ornekBaslik: 'Oyuncak örnek: 2 boyutlu Q ve K',
            ornek: ['Q("o")      = [ 2  1 ]', 'K("Ayşe")   = [ 2  0 ]  → 2·2 + 1·0 = 4', 'K("kitabı") = [ 0  1 ]  → 2·0 + 1·1 = 1', '√2 ≈ 1,41  → puanlar [ 2,83   0,71 ]'],
            ekranda: `Son satır ${son} parçasının puanları.`,
            terimler: ['nokta çarpım', 'sorgu', 'anahtar'],
        },
        {
            baslik: 'Geleceğe bakmak yasak',
            hikaye: 'Model metni soldan sağa yazar; bir parça kendinden sonra gelenleri bilemez. Bu yüzden tablonun köşegeninin üstü −∞ yapılır. Softmax\'ta e^(−∞) tam 0 olduğu için oraya hiç dikkat gitmez.',
            ornekBaslik: 'Oyuncak örnek: maske',
            ornek: ['          Ali    kitabı   o', 'Ali    [  1,2    −∞     −∞  ]', 'kitabı [  0,4    2,1    −∞  ]', 'o      [  2,8    0,7    1,5 ]'],
            ekranda: 'Koyu kırmızı hücreler maskeli (−∞).',
            terimler: ['maske', 'softmax'],
        },
        {
            baslik: 'Puanlar paya',
            hikaye: 'Her satıra ayrı ayrı softmax uygulanır: her puanın üstelini al, satırın toplamına böl. Böylece her satır, toplamı %100 olan dikkat paylarına dönüşür.',
            ornekBaslik: 'Oyuncak örnek: tek satır',
            ornek: ['puanlar = [ 2,83   0,71   −∞ ]', 'eˣ      = [ 16,9   2,0    0  ]', 'toplam  = 18,9', 'paylar  = [ %89    %11    %0 ]'],
            ekranda: `${son} satırında en büyük pay: ${Q(v.tokenler[j])} (${yuzde(v.P[v.n - 1][j])}).`,
            terimler: ['softmax', 'olasılık'],
        },
        {
            baslik: 'Bilgiyi topla',
            hikaye: 'Paylar (A) değer vektörleriyle (V) çarpılır: O = A·V. Böylece her parçanın yeni vektörü, baktığı parçaların V\'lerinin ağırlıklı ortalaması olur.',
            ornekBaslik: 'Oyuncak örnek: ağırlıklı ortalama',
            ornek: ['A("o")      = [ 0,89  0,11 ]', 'V("Ayşe")   = [ 1  0 ]', 'V("kitabı") = [ 0  1 ]', 'O("o") = 0,89·[1 0] + 0,11·[0 1] = [ 0,89  0,11 ]'],
            ekranda: 'Tarama: A\'nın satırı × V\'nin sütunu.',
            terimler: ['değer', 'ağırlıklı toplam'],
        },
        {
            baslik: 'Dedektifler birleşiyor',
            hikaye: `${v.H} başın her biri ${v.A} sayılık bir çıktı üretti. Bunlar yan yana dizilir (${v.H} × ${v.A} = ${v.C}) ve W_O matrisiyle karıştırılır (izdüşüm). Sonuç bloğun girdisinin üstüne eklenir: X' = X + dikkat. Bu artık bağlantıdır.`,
            ornekBaslik: 'Oyuncak örnek: 2 baş',
            ornek: ['O₁ = [ 0,9  0,1 ]     O₂ = [ −0,3  0,5 ]', 'yan yana = [ 0,9  0,1  −0,3  0,5 ]', '· W_O (4 × 4)  → dikkat çıktısı', "X' = X + dikkat"],
            ekranda: 'Önce başlar yan yana, sonra W_O, sonra X ile toplama.',
            terimler: ['baş', 'izdüşüm', 'artık bağlantı'],
        },
        {
            baslik: 'MLP: aç, süz, kapat',
            hikaye: `X' yeniden normlanır (N₂), W₁ ile ${v.C} kanaldan ${(4 * v.C).toLocaleString('tr-TR')} nörona açılır. GELU zayıf ve negatif sinyalleri söndürür. W₂ ile yeniden ${v.C} kanala inilir ve sonuç artık yola eklenir.`,
            ornekBaslik: 'Oyuncak örnek: GELU',
            ornek: ['H        = [ −2     0,5    2   ]', 'GELU(H)  = [ −0,05  0,35   1,95 ]', '· W₂  → yeniden 768 sayı', "X₂ = X' + MLP"],
            ekranda: 'Alttaki satır GELU\'dan sonra: sönen hücrelere bak.',
            terimler: ['mlp', 'nöron', 'gelu'],
        },
        {
            baslik: '12 kat',
            hikaye: `Her blok aynı biçimde bir tablo alır ve aynı biçimde geri verir (${v.n} × ${v.C}). ${v.L} blok art arda; sahnedeki her levha bir bloğun çıktısı. Sağdaki etiketler o kattan sonraki tahmin (logit merceği).`,
            ornekBaslik: 'Kat kat',
            ornek: ['X⁽⁰⁾  → Blok 1  → X⁽¹⁾', 'X⁽¹⁾  → Blok 2  → X⁽²⁾', '…', `X⁽${ust(v.L - 1)}⁾ → Blok ${v.L} → X⁽${ust(v.L)}⁾`],
            ekranda: 'Kırmızı satır son parça; tahmini her katta netleşiyor.',
            terimler: ['blok', 'logit merceği'],
        },
        {
            baslik: 'Sözlükle karşılaştır',
            hikaye: `Son satır son bir kez normlanır (h) ve sözlükteki her parçanın gömme vektörüyle nokta çarpılır: logit = h·Eᵀ. Girişteki gömme tablosunun aynısı kullanılır (ağırlık paylaşımı).`,
            ornekBaslik: 'Oyuncak örnek: 3 boyutlu h',
            ornek: ['h            = [ 1  −1   2 ]', 'E("Ankara")  = [ 2   0   1 ]  →  4', 'E("kedi")    = [ 0   1  −1 ]  → −3', 'E("ve")      = [ 1   1   0 ]  →  0'],
            ekranda: `${v.sozluk.toLocaleString('tr-TR')} logitten en büyük ${GV}'si görünüyor.`,
            terimler: ['logit', 'gömme'],
        },
        {
            baslik: 'Cesaret düğmesi',
            hikaye: 'Logitler softmax ile olasılığa çevrilmeden önce sıcaklığa (T) bölünür. T küçükse farklar büyür ve model temkinli seçer; T büyükse farklar küçülür ve sürprizli seçimler artar.',
            ornekBaslik: 'Oyuncak örnek: aynı logitler, üç sıcaklık',
            ornek: ['logitler  = [ 2     1     0   ]', 'T = 0,5 → [ %87   %12   %2  ]', 'T = 1   → [ %67   %24   %9  ]', 'T = 2   → [ %51   %31   %19 ]'],
            ekranda: 'Üstteki kaydırıcıyla sıcaklığı değiştir, çubukları izle.',
            terimler: ['sıcaklık', 'softmax', 'örnekleme'],
        },
    ];
}

function ayrintiEN(v: IAyrintiVeri): IKart[] {
    let son = Q(v.tokenler[v.n - 1]), j = enBuyukJ(v), kok = Math.sqrt(v.A);
    return [
        {
            baslik: 'Into the block',
            hikaye: `It's me again, ASY! This time we go inside one Transformer block and see every multiplication with real numbers. What enters the block is a table, a matrix: each row is a token, each column a channel. There are ${v.n} rows × ${v.C} columns; ${GC} columns are shown.`,
            ornekBaslik: 'Toy example: 3 tokens × 3 channels',
            ornek: ['           c₀     c₁     c₂', '"Alice" [  0.2  −1.1   0.7 ]', '"book"  [  1.3   0.4  −0.2 ]', '"she"   [ −0.5   0.9   1.8 ]'],
            ornekNot: 'Each row is the vector that token carries into this block.',
            ekranda: `Block ${v.katman + 1}, head ${v.bas + 1} is shown (change it at the top). Hover a cell to read its exact value.`,
            terimler: ['matrix', 'vector', 'block'],
        },
        {
            baslik: 'Row-by-row balance',
            hikaye: 'We balance each row separately: subtract its mean (μ), then divide by its spread (σ). Then rescale with two learned settings, γ (scale) and β (shift). Rows never affect each other.',
            ornekBaslik: 'Toy example: one row',
            ornek: ['row        = [  2     4     6   ]', 'μ = 4,  σ ≈ 1.63', '(x − μ)/σ  = [ −1.22  0     1.22 ]', 'γ = 2, β = 0.5 → [ −1.95  0.5  2.95 ]'],
            ekranda: 'The μ and σ columns are each row\'s values; N₁ is the balanced table.',
            terimler: ['layer norm', 'mean', 'standard deviation'],
        },
        {
            baslik: 'Three cards: Q, K, V',
            hikaye: 'Each row is multiplied by three separate weight matrices, giving three new vectors: query (Q), key (K) and value (V). In a matrix product, each cell of the result is the dot product of a row of the left matrix and a column of the right one. Every head has its own W_Q, W_K, W_V.',
            ornekBaslik: 'Toy example: row × matrix',
            ornek: ['row = [ 1  2 ]', 'W_Q = [ 3  0 ]', '      [ 1  2 ]', 'row · W_Q = [ 1·3 + 2·1   1·0 + 2·2 ] = [ 5  4 ]'],
            ornekNot: `In reality the row has ${v.C} numbers; each head's Q, K, V vectors have ${v.A}.`,
            ekranda: 'Scan: the glowing row of N₁ × the glowing column of W = the glowing cell of the result.',
            terimler: ['query', 'key', 'value', 'dot product', 'weight'],
        },
        {
            baslik: 'The score table',
            hikaye: `Now every token's question is dot-multiplied with every token's key: Q·Kᵀ. The result is an ${v.n}×${v.n} table: the row is the token "asking", the column the token "looked at". Scores are divided by √${v.A} = ${kok}; otherwise softmax becomes too sharp and picks almost a single token.`,
            ornekBaslik: 'Toy example: 2-dimensional Q and K',
            ornek: ['Q("she")   = [ 2  1 ]', 'K("Mary")  = [ 2  0 ]  → 2·2 + 1·0 = 4', 'K("book")  = [ 0  1 ]  → 2·0 + 1·1 = 1', '√2 ≈ 1.41  → scores [ 2.83   0.71 ]'],
            ekranda: `The last row holds the scores of ${son}.`,
            terimler: ['dot product', 'query', 'key'],
        },
        {
            baslik: 'No peeking ahead',
            hikaye: 'The model writes from left to right; a token cannot know what comes after it. So everything above the diagonal is set to −∞. In softmax e^(−∞) is exactly 0, so no attention goes there.',
            ornekBaslik: 'Toy example: the mask',
            ornek: ['          Alice   book    she', 'Alice  [  1.2    −∞     −∞  ]', 'book   [  0.4    2.1    −∞  ]', 'she    [  2.8    0.7    1.5 ]'],
            ekranda: 'Dark red cells are masked (−∞).',
            terimler: ['mask', 'softmax'],
        },
        {
            baslik: 'Scores into shares',
            hikaye: 'Softmax is applied to each row separately: exponentiate every score and divide by the row total. Each row becomes attention shares that add up to 100%.',
            ornekBaslik: 'Toy example: one row',
            ornek: ['scores = [ 2.83   0.71   −∞ ]', 'eˣ     = [ 16.9   2.0    0  ]', 'total  = 18.9', 'shares = [ 89%    11%    0% ]'],
            ekranda: `In the ${son} row the largest share goes to ${Q(v.tokenler[j])} (${yuzde(v.P[v.n - 1][j])}).`,
            terimler: ['softmax', 'probability'],
        },
        {
            baslik: 'Collect the information',
            hikaye: 'The shares (A) are multiplied by the value vectors (V): O = A·V. Each token\'s new vector becomes a weighted average of the V\'s of the tokens it looks at.',
            ornekBaslik: 'Toy example: weighted average',
            ornek: ['A("she")  = [ 0.89  0.11 ]', 'V("Mary") = [ 1  0 ]', 'V("book") = [ 0  1 ]', 'O("she") = 0.89·[1 0] + 0.11·[0 1] = [ 0.89  0.11 ]'],
            ekranda: 'Scan: a row of A × a column of V.',
            terimler: ['value', 'weighted sum'],
        },
        {
            baslik: 'The detectives meet',
            hikaye: `Each of the ${v.H} heads produced a ${v.A}-number output. They are placed side by side (${v.H} × ${v.A} = ${v.C}) and mixed with the W_O matrix (a projection). The result is added on top of the block's input: X' = X + attention. This is the residual connection.`,
            ornekBaslik: 'Toy example: 2 heads',
            ornek: ['O₁ = [ 0.9  0.1 ]     O₂ = [ −0.3  0.5 ]', 'side by side = [ 0.9  0.1  −0.3  0.5 ]', '· W_O (4 × 4)  → attention output', "X' = X + attention"],
            ekranda: 'First the heads side by side, then W_O, then the addition with X.',
            terimler: ['head', 'projection', 'residual connection'],
        },
        {
            baslik: 'MLP: expand, filter, shrink',
            hikaye: `X' is normalized again (N₂) and W₁ expands it from ${v.C} channels to ${(4 * v.C).toLocaleString('en-US')} neurons. GELU turns weak and negative signals off. W₂ brings it back to ${v.C} channels and the result is added to the residual stream.`,
            ornekBaslik: 'Toy example: GELU',
            ornek: ['H        = [ −2     0.5    2   ]', 'GELU(H)  = [ −0.05  0.35   1.95 ]', '· W₂  → 768 numbers again', "X₂ = X' + MLP"],
            ekranda: 'The lower row is after GELU: look at the cells that go dark.',
            terimler: ['mlp', 'neuron', 'gelu'],
        },
        {
            baslik: '12 floors',
            hikaye: `Each block takes a table and returns one of the same shape (${v.n} × ${v.C}). ${v.L} blocks in a row; each slab in the scene is one block's output. The labels on the right are the prediction after that floor (logit lens).`,
            ornekBaslik: 'Floor by floor',
            ornek: ['X⁽⁰⁾  → Block 1  → X⁽¹⁾', 'X⁽¹⁾  → Block 2  → X⁽²⁾', '…', `X⁽${ust(v.L - 1)}⁾ → Block ${v.L} → X⁽${ust(v.L)}⁾`],
            ekranda: 'The red row is the last token; its prediction sharpens floor by floor.',
            terimler: ['block', 'logit lens'],
        },
        {
            baslik: 'Compare with the vocabulary',
            hikaye: 'The last row is normalized one final time (h) and dot-multiplied with the embedding vector of every token in the vocabulary: logit = h·Eᵀ. The same embedding table as at the input is used (weight tying).',
            ornekBaslik: 'Toy example: 3-dimensional h',
            ornek: ['h           = [ 1  −1   2 ]', 'E("Paris")  = [ 2   0   1 ]  →  4', 'E("cat")    = [ 0   1  −1 ]  → −3', 'E("and")    = [ 1   1   0 ]  →  0'],
            ekranda: `The top ${GV} of ${v.sozluk.toLocaleString('en-US')} logits are shown.`,
            terimler: ['logit', 'embedding'],
        },
        {
            baslik: 'The courage knob',
            hikaye: 'Before softmax turns logits into probabilities, they are divided by the temperature (T). A small T makes the gaps bigger and the model picks cautiously; a large T shrinks the gaps and surprising picks become more common.',
            ornekBaslik: 'Toy example: same logits, three temperatures',
            ornek: ['logits    = [ 2     1     0   ]', 'T = 0.5 → [ 87%   12%   2%  ]', 'T = 1   → [ 67%   24%   9%  ]', 'T = 2   → [ 51%   31%   19% ]'],
            ekranda: 'Change the temperature with the slider at the top and watch the bars.',
            terimler: ['temperature', 'softmax', 'sampling'],
        },
    ];
}

export const ayrintiKartlari = (v: IAyrintiVeri): IKart[] => (EN ? ayrintiEN(v) : ayrintiTR(v));
