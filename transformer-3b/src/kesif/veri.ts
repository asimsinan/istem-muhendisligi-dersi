// TR: Keşif modu verisi. Tarayıcıda çalışan modelin ileri geçiş sonucundan (ISonuc) herhangi bir parça,
// blok ve baş için okunur değerler çıkarır. Bütün sayılar gerçek.
import { ISonuc, ITurkceModel } from '@/src/llm/tr/TurkceModel';

export interface IAday { id: number; metin: string; p: number }
export interface IBasOzeti { bas: number; hedef: number; pay: number }
export interface IMercek { blok: number; metin: string; p: number }

/** i. parçanın l. blok h. başta önceki parçalara (j ≤ i) dikkat payları */
export function dikkatSatiri(s: ISonuc, l: number, h: number, i: number): number[] {
    let T = s.T, o = h * T * T + i * T;
    return Array.from({ length: i + 1 }, (_, j) => s.bloklar[l].attsm[o + j]);
}

/** l. blokta her başın i. parça için en çok baktığı parça (kendisi hariç; i = 0 ise kendisi) */
export function basOzetleri(s: ISonuc, l: number, i: number, H: number): IBasOzeti[] {
    return Array.from({ length: H }, (_, h) => {
        let r = dikkatSatiri(s, l, h, i), en = i === 0 ? 0 : -1, mx = -1;
        r.forEach((p, j) => { if ((j !== i || i === 0) && p > mx) { mx = p; en = j; } });
        return { bas: h, hedef: en, pay: mx };
    });
}

/** i. parçadan sonra gelecek parça için en olası k aday (modelin çıktısı) */
export function adaylar(m: ITurkceModel, s: ISonuc, i: number, k = 6): IAday[] {
    let V = m.config.vocab_size, o = i * V, en: { id: number; p: number }[] = [];
    for (let v = 0; v < V; v++) {
        let p = s.sm[o + v];
        if (en.length < k || p > en[en.length - 1].p) { en.push({ id: v, p }); en.sort((a, b) => b.p - a.p); if (en.length > k) en.pop(); }
    }
    return en.map(e => ({ id: e.id, metin: m.tok.coz([e.id]), p: e.p }));
}

/** i. parçanın girdi vektörünün (gömme + konum) ilk k sayısı */
export function vektorBasi(m: ITurkceModel, s: ISonuc, i: number, k = 12): number[] {
    let C = m.config.n_embd;
    return Array.from(s.x0.subarray(i * C, i * C + k));
}

/** l. bloktan sonra i. parçanın vektörünün ilk k sayısı */
export function blokSonrasi(m: ITurkceModel, s: ISonuc, l: number, i: number, k = 12): number[] {
    let C = m.config.n_embd;
    return Array.from(s.bloklar[l].res2.subarray(i * C, i * C + k));
}

/** Logit merceği: her bloğun çıktısı son norm + çıktı matrisinden geçirilir: "bu blokta tahmin ne olurdu?"
 *  (12 × 50.257 × 768 işlem, ≈1 sn; arkadan çağrılır) */
export function mercek(m: ITurkceModel, s: ISonuc, t: number): IMercek[] {
    let { n_embd: C, vocab_size: V } = m.config;
    let g = m.t['ln_f.g'].f32!, b = m.t['ln_f.b'].f32!, W = m.t.wte;
    let x = new Float32Array(C), logit = new Float32Array(V);
    return s.bloklar.map((k, l) => {
        let r = k.res2.subarray(t * C, (t + 1) * C), ort = 0, vr = 0;
        for (let c = 0; c < C; c++) ort += r[c];
        ort /= C;
        for (let c = 0; c < C; c++) vr += (r[c] - ort) ** 2;
        let sd = Math.sqrt(vr / C + 1e-5);
        for (let c = 0; c < C; c++) x[c] = (r[c] - ort) / sd * g[c] + b[c];
        let mx = -Infinity, en = 0;
        for (let v = 0; v < V; v++) {
            let o = v * C, d = 0;
            for (let c = 0; c < C; c++) d += W.i8![o + c] * x[c];
            d *= W.olcek![v];
            logit[v] = d;
            if (d > mx) { mx = d; en = v; }
        }
        let top = 0;
        for (let v = 0; v < V; v++) top += Math.exp(logit[v] - mx);
        return { blok: l + 1, metin: m.tok.coz([en]), p: 1 / top };
    });
}

// ---------- mimari yolculuğu: ara değerler ----------

/** düz dizi içinden t. satırın [bas, bas+k) dilimi */
export const dilim = (a: Float32Array, t: number, gen: number, bas = 0, k = gen) => Array.from(a.subarray(t * gen + bas, t * gen + bas + k));

export function uzunluk(v: ArrayLike<number>) { let t = 0; for (let i = 0; i < v.length; i++) t += v[i] * v[i]; return Math.sqrt(t); }
export function ortSd(v: ArrayLike<number>) {
    let o = 0; for (let i = 0; i < v.length; i++) o += v[i];
    o /= v.length; let s = 0;
    for (let i = 0; i < v.length; i++) s += (v[i] - o) ** 2;
    return { ort: o, sd: Math.sqrt(s / v.length) };
}

/** gömme tablosunun id. satırı (768) */
export function gommeSatiri(m: ITurkceModel, id: number) {
    let C = m.config.n_embd, w = m.t.wte, s = w.olcek![id];
    return Array.from({ length: C }, (_, c) => w.i8![id * C + c] * s);
}
/** konum tablosunun i. satırı (768) */
export function konumSatiri(m: ITurkceModel, i: number) {
    let C = m.config.n_embd;
    return Array.from(m.t.wpe.f32!.subarray(i * C, (i + 1) * C));
}
/** l. bloğa giren vektör (i. parça) */
export function blokGirdisi(m: ITurkceModel, s: ISonuc, l: number, i: number) {
    let C = m.config.n_embd;
    return l === 0 ? dilim(s.x0, i, C) : dilim(s.bloklar[l - 1].res2, i, C);
}
/** Q, K, V: i. parçanın h. baştaki 64'lük dilimleri */
export function qkv(m: ITurkceModel, s: ISonuc, l: number, h: number, i: number) {
    let C = m.config.n_embd, A = C / m.config.n_head, q = s.bloklar[l].qkv;
    let al = (k: number) => Array.from(q.subarray(i * 3 * C + k * C + h * A, i * 3 * C + k * C + (h + 1) * A));
    return { q: al(0), k: al(1), v: al(2) };
}
/** ham dikkat skorları (q·k / √64), j ≤ i */
export function skorSatiri(s: ISonuc, l: number, h: number, i: number) {
    let T = s.T, o = h * T * T + i * T;
    return Array.from({ length: i + 1 }, (_, j) => s.bloklar[l].att[o + j]);
}
/** MLP: 3.072 nöron (genişletme ya da GELU sonrası) */
export function mlpSatiri(m: ITurkceModel, s: ISonuc, l: number, i: number, gelu: boolean) {
    let C4 = 4 * m.config.n_embd, a = gelu ? s.bloklar[l].gelu : s.bloklar[l].fc;
    return a.subarray(i * C4, (i + 1) * C4);
}
export function enBuyukler(a: ArrayLike<number>, k: number) {
    let en: { j: number; v: number }[] = [];
    for (let j = 0; j < a.length; j++) {
        let v = a[j];
        if (en.length < k || v > en[en.length - 1].v) { en.push({ j, v }); en.sort((x, y) => y.v - x.v); if (en.length > k) en.pop(); }
    }
    return en;
}

export interface ISicakAday extends IAday { logit: number }
/** i. konumun logitleri sıcaklık T ile: en yüksek k aday ve olasılıkları (bütün 50.257 üzerinden) */
export function sicaklikAdaylari(m: ITurkceModel, s: ISonuc, i: number, T: number, k = 8): ISicakAday[] {
    let V = m.config.vocab_size, o = i * V, lg = s.logits, mx = -Infinity;
    for (let v = 0; v < V; v++) if (lg[o + v] > mx) mx = lg[o + v];
    let top = 0;
    for (let v = 0; v < V; v++) top += Math.exp((lg[o + v] - mx) / T);
    let en = enBuyukler(lg.subarray(o, o + V), k);
    return en.map(e => ({ id: e.j, metin: m.tok.coz([e.j]), logit: e.v, p: Math.exp((e.v - mx) / T) / top }));
}
/** sıcaklık T ile bütün sözlükten örnekle */
export function ornekle(m: ITurkceModel, s: ISonuc, i: number, T: number) {
    let V = m.config.vocab_size, o = i * V, lg = s.logits, mx = -Infinity;
    for (let v = 0; v < V; v++) if (lg[o + v] > mx) mx = lg[o + v];
    let w = new Float32Array(V), top = 0;
    for (let v = 0; v < V; v++) { w[v] = Math.exp((lg[o + v] - mx) / T); top += w[v]; }
    let r = Math.random() * top;
    for (let v = 0; v < V; v++) { r -= w[v]; if (r <= 0) return v; }
    return V - 1;
}
