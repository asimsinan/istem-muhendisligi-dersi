// TR: Anlatımın üzerinde konuştuğu örnek cümle (sahnede o an çalışan girdi). Özgün anlatım "CBABBC" ve
// sabit konumlar (t = 3, t = 5) kullanıyordu; burada değerler girdiden okunur.
import { IProgramState } from '../Program';
import { ITurkceLink } from './TurkceModel';
import { ORNEK_CUMLE, sozlukGrubu } from './ayarlar';

export interface IOrnek {
    n: number;                 // token sayısı
    tokenler: string[];        // okunur parçalar ("·" = boşluk)
    ids: number[];
    sira: number;              // gömme, normalizasyon, Q ve MLP adımlarında izlenen token
    dikkatSira: number;        // dikkat adımında sorgulayan token (son token)
    tahmin: { metin: string; p: number }[];
    vk: number;                // sözlük gösterim grubu
    varsayilan: boolean;       // girdi, anlatımın varsayılan örnek cümlesi mi
}

export const okunur = (t: string) => t.replace(/ /g, '·');

export function ornek(state: IProgramState): IOrnek {
    let link = state.jsGptModel as ITurkceLink | null;
    let s = link?.sonuc;
    let vk = sozlukGrubu(state.shape.vocabSize);
    if (!link || !s) {
        return { n: 8, tokenler: [], ids: [], sira: 2, dikkatSira: 7, tahmin: [], vk, varsayilan: true };
    }
    let tokenler = s.ids.map(id => okunur(link!.turkce.tok.coz([id])));
    let n = s.n;
    let V = link.shape.vocabSize, o = (n - 1) * V;
    let enIyi: { id: number; p: number }[] = [];
    for (let v = 0; v < V; v++) {
        let p = s.sm[o + v];
        if (enIyi.length < 3 || p > enIyi[enIyi.length - 1].p) {
            enIyi.push({ id: v, p }); enIyi.sort((a, b) => b.p - a.p); if (enIyi.length > 3) enIyi.pop();
        }
    }
    return {
        n, tokenler, ids: s.ids, vk,
        varsayilan: link.turkce.tok.coz(s.ids) === ORNEK_CUMLE,
        sira: Math.min(2, n - 1),
        dikkatSira: n - 1,
        tahmin: enIyi.map(e => ({ metin: okunur(link!.turkce.tok.coz([e.id])), p: e.p })),
    };
}

export const yuzde = (p: number) => '%' + (p * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
export const sayi = (n: number) => n.toLocaleString('tr-TR');
