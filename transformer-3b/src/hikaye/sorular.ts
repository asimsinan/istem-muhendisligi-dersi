// TR: "Önce tahmin et" soruları. Bazı adımlardan önce öğrenciye modelin ne yapacağını tahmin etmesi sorulur;
// cevaptan sonra animasyon gerçeği gösterir (tahmin et → gözle → açıkla). Doğru cevap her zaman modelin
// o anki gerçek çıktısıdır (seçili blok ve baş, gerçek olasılıklar).
import { IHikayeVeri, okunur, yuzde } from './veri';
import { IAyrintiVeri } from '../ayrinti/veri';
import { enBuyukJ } from '../ayrinti/akis';
import { L } from '../llm/tr/dil';

export interface ISecenek { id: number; metin: string; deger: number }   // deger: payı ya da olasılığı
export interface ISoru { soru: string; ipucu: string; secenekler: ISecenek[]; dogru: number; birim: string }

const Q = (t: string) => `"${t.trim() || okunur(t)}"`;
const gor = (t: string) => t.trim() || okunur(t);

function dikkatSorusu(tokenler: string[], satir: number[], odak: number, dogru: number, baslik: string, kendisiDahil: boolean): ISoru {
    let secenekler = tokenler.slice(0, odak + (kendisiDahil ? 1 : 0)).map((t, j) => ({ id: j, metin: gor(t), deger: satir[j] }));
    return {
        soru: L(`Sence ${Q(tokenler[odak])} en çok hangi parçaya bakacak?`, `Which token do you think ${Q(tokenler[odak])} will look at most?`),
        ipucu: baslik, secenekler, dogru, birim: L('dikkat payı', 'attention share'),
    };
}

function sonrakiSorusu(adaylar: { id: number; metin: string; p: number }[]): ISoru {
    let d = adaylar.slice(0, 4);
    let secenekler = d.map(a => ({ id: a.id, metin: gor(a.metin), deger: a.p })).sort((a, b) => a.metin.localeCompare(b.metin));
    return {
        soru: L('Sence model sıradaki parça olarak hangisini en olası bulacak?', 'Which one do you think the model will find the most likely next token?'),
        ipucu: L('En olası dört aday, alfabetik sırayla.', 'The four most likely candidates, in alphabetical order.'),
        secenekler, dogru: d[0].id, birim: L('olasılık', 'probability'),
    };
}

/** adım → soru (yalnızca soru sorulan adımlar) */
export function anlatimSorulari(v: IHikayeVeri, d: { katman: number; bas: number }): Record<number, ISoru> {
    let out: Record<number, ISoru> = {};
    if (v.odak > 0) {
        let s = v.dikkat[d.katman][d.bas];
        let en = s.map((p, j) => ({ p, j })).filter(e => e.j !== v.odak).sort((a, b) => b.p - a.p)[0];
        out[4] = dikkatSorusu(v.tokenler, s, v.odak, en.j, L(`${d.katman + 1}. blok, ${d.bas + 1}. baş (sağ üstten değiştirilebilir). Kendisi hariç.`, `Block ${d.katman + 1}, head ${d.bas + 1} (can be changed at the top). Excluding itself.`), false);
    }
    if (v.olasiliklar.length >= 2) out[8] = sonrakiSorusu(v.olasiliklar.map(o => ({ id: o.id, metin: o.metin, p: o.p })));
    return out;
}

export function ayrintiSorulari(v: IAyrintiVeri, sicaklikOlasilik: (ids: number[]) => number[]): Record<number, ISoru> {
    let out: Record<number, ISoru> = {};
    let son = v.n - 1;
    out[5] = dikkatSorusu(v.tokenler, v.P[son], son, enBuyukJ(v), L(`${v.katman + 1}. blok, ${v.bas + 1}. baş. Kendisi de seçilebilir.`, `Block ${v.katman + 1}, head ${v.bas + 1}. It may also choose itself.`), true);
    let p = sicaklikOlasilik(v.enIyi.map(e => e.id));
    out[10] = sonrakiSorusu(v.enIyi.map((e, i) => ({ id: e.id, metin: e.metin, p: p[i] })));
    return out;
}

export const degerYazi = (x: number) => yuzde(x);
