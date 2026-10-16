// TR: Ayrıntılı görünümün verisi: seçili bloğun ve başın gerçek matrisleri. Sahne okunur kalsın diye her eksenden
// eşit aralıklı birkaç sütun gösterilir; gösterilen her hücre modeldeki gerçek sayıdır (hesap tam boyutta yapılır).
import { ISonuc, ITurkceModel } from '@/src/llm/tr/TurkceModel';

export const GC = 24;   // 768 kanaldan gösterilen
export const GA = 12;   // baş boyutu 64'ten gösterilen
export const GF = 36;   // MLP'nin 3.072 nöronundan gösterilen
export const GV = 12;   // en olası parça sayısı (çıktı)

export type Mat = number[][];

export interface IAyrintiVeri {
    n: number; C: number; A: number; H: number; L: number; sozluk: number;
    katman: number; bas: number;
    tokenler: string[];
    kanal: number[];      // gösterilen kanalların numaraları
    boyut: number[];      // gösterilen baş boyutları
    noron: number[];      // gösterilen MLP nöronları
    X: Mat; mu: number[]; sd: number[]; Xn: Mat;
    Wq: Mat; Wk: Mat; Wv: Mat;            // [GC][GA]
    Q: Mat; K: Mat; V: Mat;                // [n][GA]
    S: Mat; P: Mat;                        // [n][n] (j > i: maskeli)
    O: Mat;                                // [n][GA]
    birlesik: Mat; Wo: Mat; proj: Mat; X1: Mat;   // [n][GC], Wo [GC][GC]
    Xn2: Mat; W1: Mat; Hf: Mat; G: Mat; W2: Mat; mlp: Mat; X2: Mat;
    bloklar: Mat[];                        // her bloğun çıktısı [L][n][GC]
    hSon: number[];                        // son normdan sonra son parça [GC]
    enIyi: { id: number; metin: string; logit: number }[];
    Wcikti: Mat;                           // [GC][GV] (gömme tablosunun satırları, devrik)
    logitler: Float32Array;                // son parçanın bütün logitleri
}

const aralik = (N: number, k: number) => Array.from({ length: k }, (_, i) => Math.floor((i + 0.5) * N / k));

export function ayrintiVerisi(m: ITurkceModel, s: ISonuc, katman: number, bas: number): IAyrintiVeri {
    let { n_embd: C, n_head: H, n_layer: L, vocab_size: V } = m.config;
    let A = C / H, n = s.n, T = s.T, F = 4 * C;
    let kanal = aralik(C, GC), boyut = aralik(A, GA), noron = aralik(F, GF);
    let b = s.bloklar[katman], W = m.t, p = `h${katman}.`;
    let satirlar = (v: Float32Array, gen: number, idx: number[]) => Array.from({ length: n }, (_, t) => idx.map(c => v[t * gen + c]));
    let agirlik = (ad: string, girdi: number[], cikti: number[]) => {
        let w = W[ad], gen = w.sekil[1];
        return girdi.map(c => cikti.map(o => w.i8![o * gen + c] * w.olcek![o]));
    };
    let girisX = katman === 0 ? s.x0 : s.bloklar[katman - 1].res2;
    let bOff = bas * A;
    let q = boyut.map(a => bOff + a), k = boyut.map(a => C + bOff + a), vv = boyut.map(a => 2 * C + bOff + a);
    let kare = (v: Float32Array) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j <= i ? v[bas * T * T + i * T + j] : 0));

    let son = n - 1, ol = son * V, sira: { id: number; l: number }[] = [];
    for (let id = 0; id < V; id++) {
        let l = s.logits[ol + id];
        if (sira.length < GV || l > sira[sira.length - 1].l) { sira.push({ id, l }); sira.sort((a, b) => b.l - a.l); if (sira.length > GV) sira.pop(); }
    }
    let wte = W.wte;

    return {
        n, C, A, H, L, sozluk: V, katman, bas,
        tokenler: s.ids.slice(0, n).map(id => m.tok.coz([id])),
        kanal, boyut, noron,
        X: satirlar(girisX, C, kanal),
        mu: Array.from({ length: n }, (_, t) => b.ln1agg[t * 2]),
        sd: Array.from({ length: n }, (_, t) => b.ln1agg[t * 2 + 1]),
        Xn: satirlar(b.ln1, C, kanal),
        Wq: agirlik(p + 'attn.w', kanal, q), Wk: agirlik(p + 'attn.w', kanal, k), Wv: agirlik(p + 'attn.w', kanal, vv),
        Q: satirlar(b.qkv, 3 * C, q), K: satirlar(b.qkv, 3 * C, k), V: satirlar(b.qkv, 3 * C, vv),
        S: kare(b.att), P: kare(b.attsm),
        O: satirlar(b.vout, C, q),
        birlesik: satirlar(b.vout, C, kanal),
        Wo: agirlik(p + 'proj.w', kanal, kanal),
        proj: satirlar(b.proj, C, kanal),
        X1: satirlar(b.res1, C, kanal),
        Xn2: satirlar(b.ln2, C, kanal),
        W1: agirlik(p + 'fc.w', kanal, noron),
        Hf: satirlar(b.fc, F, noron),
        G: satirlar(b.gelu, F, noron),
        W2: agirlik(p + 'mproj.w', noron, kanal),
        mlp: satirlar(b.mproj, C, kanal),
        X2: satirlar(b.res2, C, kanal),
        bloklar: s.bloklar.map(k => satirlar(k.res2, C, kanal)),
        hSon: kanal.map(c => s.lnf[son * C + c]),
        enIyi: sira.map(e => ({ id: e.id, metin: m.tok.coz([e.id]), logit: e.l })),
        Wcikti: kanal.map(c => sira.map(e => wte.i8![e.id * C + c] * wte.olcek![e.id])),
        logitler: s.logits.slice(ol, ol + V),
    };
}

// Sıcaklıklı softmax: en olası GV parçanın olasılıkları (bütün sözlük üzerinden normalleştirilmiş)
export function sicaklikliOlasilik(logit: Float32Array, idler: number[], sicaklik: number) {
    let mx = -Infinity;
    for (let i = 0; i < logit.length; i++) if (logit[i] > mx) mx = logit[i];
    let top = 0;
    for (let i = 0; i < logit.length; i++) top += Math.exp((logit[i] - mx) / sicaklik);
    return idler.map(id => Math.exp((logit[id] - mx) / sicaklik) / top);
}
