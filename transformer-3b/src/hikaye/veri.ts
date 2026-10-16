// TR: Sinematik 3B anlatımın verisi. Tarayıcıda çalışan Türkçe GPT-2'nin ileri geçişinden (ISonuc) sahnede
// gösterilecek küçük, okunur parçalar çıkarılır. Bütün sayılar gerçek; vektörlerin yalnızca bir kısmı gösterilir.
import { ISonuc, ITurkceModel } from '@/src/llm/tr/TurkceModel';
import { EN, YEREL } from '../llm/tr/dil';

export const K = 16;                 // bir vektörden gösterilen eleman sayısı (768 kanaldan eşit aralıklı)
export const NORON = 96;             // MLP'den gösterilen nöron sayısı (3.072'den eşit aralıklı)
const kanallar = (C: number) => Array.from({ length: K }, (_, j) => Math.floor(j * C / K));

export interface IMercekSatiri { blok: number; metin: string; p: number }
export interface IOlasilik { id: number; metin: string; logit: number; p: number }

export interface IHikayeVeri {
    n: number;
    tokenler: string[];          // çözülmüş parça metinleri (baştaki boşluk korunur)
    ids: number[];
    odak: number;                // izlenen parça: son parça (tahmin onun için yapılır)
    C: number; V: number; L: number; H: number;
    tok: number[][];             // [parça][K] token gömmesi
    poz: number[][];             // [parça][K] konum gömmesi
    x0: number[][];              // [parça][K] girdi gömmesi (toplam)
    ln: { mu: number; sd: number; v: number[] };        // odak parçanın 1. bloktaki normalizasyonu
    dikkat: number[][][];        // [katman][baş][j] odak parçanın j'ye dikkati (j ≤ odak)
    res1: number[];              // odak parça: dikkatten sonra artık yol [K]
    katki: number[];             // dikkatin katkısı (izdüşüm) [K]
    gelu: number[];              // odak parça: GELU sonrası [NORON]
    etkinOran: number;           // GELU > 0,1 olan nöronların oranı (3.072 içinde)
    mlpKatki: number[];          // MLP'nin katkısı [K]
    res2: number[];              // 1. bloğun çıktısı [K]
    mercek: IMercekSatiri[] | null;   // her bloktan sonraki tahmin (arkadan hesaplanır)
    olasiliklar: IOlasilik[];    // en olası 24 parça (logit + olasılık)
    entropi: number;
    varsayilanDikkat: { katman: number; bas: number };
}

const satir = (v: Float32Array, t: number, w: number) => v.subarray(t * w, (t + 1) * w);
const sec = (v: ArrayLike<number>, idx: number[]) => idx.map(i => v[i]);

export function hikayeVerisi(m: ITurkceModel, s: ISonuc): IHikayeVeri {
    let { n_embd: C, vocab_size: V, n_layer: L, n_head: H } = m.config;
    let T = s.T, n = s.n, odak = n - 1;
    let kc = kanallar(C);
    let wte = m.t.wte, wpe = m.t.wpe.f32!;
    let tokenler = s.ids.slice(0, n).map(id => m.tok.coz([id]));

    let tok = s.ids.slice(0, n).map(id => kc.map(c => wte.i8![id * C + c] * wte.olcek![id]));
    let poz = Array.from({ length: n }, (_, t) => kc.map(c => wpe[t * C + c]));
    let x0 = Array.from({ length: n }, (_, t) => sec(satir(s.x0, t, C), kc));

    let b0 = s.bloklar[0];
    let ln = { mu: b0.ln1agg[odak * 2], sd: b0.ln1agg[odak * 2 + 1], v: sec(satir(b0.ln1, odak, C), kc) };

    let dikkat = s.bloklar.map(k => Array.from({ length: H }, (_, h) => {
        let o = h * T * T + odak * T;
        return Array.from({ length: odak + 1 }, (_, j) => k.attsm[o + j]);
    }));

    let F = 4 * C, nk = Array.from({ length: NORON }, (_, j) => Math.floor(j * F / NORON));
    let g = satir(b0.gelu, odak, F), etkin = 0;
    for (let i = 0; i < F; i++) if (g[i] > 0.1) etkin++;

    // En olası 24 parça
    let o = odak * V, enIyi: { id: number; p: number }[] = [];
    let ent = 0;
    for (let v = 0; v < V; v++) {
        let p = s.sm[o + v];
        if (p > 1e-12) ent -= p * Math.log2(p);
        if (enIyi.length < 24 || p > enIyi[enIyi.length - 1].p) {
            enIyi.push({ id: v, p }); enIyi.sort((a, b) => b.p - a.p); if (enIyi.length > 24) enIyi.pop();
        }
    }

    return {
        n, tokenler, ids: s.ids.slice(0, n), odak, C, V, L, H,
        tok, poz, x0, ln, dikkat,
        res1: sec(satir(b0.res1, odak, C), kc),
        katki: sec(satir(b0.proj, odak, C), kc),
        gelu: sec(g, nk),
        etkinOran: etkin / F,
        mlpKatki: sec(satir(b0.mproj, odak, C), kc),
        res2: sec(satir(b0.res2, odak, C), kc),
        mercek: null,
        olasiliklar: enIyi.map(e => ({ id: e.id, metin: m.tok.coz([e.id]), logit: s.logits[o + e.id], p: e.p })),
        entropi: ent,
        varsayilanDikkat: belirginBas(dikkat, odak),
    };
}

// Öğretici varsayılan: "o"nun kendisine, hemen önceki parçaya ve ilk parçaya (GPT-2'nin "dikkat çukuru") değil,
// aradaki bir parçaya en net bakan baş. Hiçbiri yoksa 1. blok 1. baş.
function belirginBas(dikkat: number[][][], odak: number) {
    let en = { katman: 0, bas: 0, puan: -1 };
    if (odak < 3) return { katman: 0, bas: 0 };
    dikkat.forEach((katman, l) => katman.forEach((satir, h) => {
        let ara = 0;
        for (let j = 1; j < odak - 1; j++) ara = Math.max(ara, satir[j]);
        let puan = ara - l * 0.004;
        if (puan > en.puan) en = { katman: l, bas: h, puan };
    }));
    return { katman: en.katman, bas: en.bas };
}

// Logit merceği: her bloğun çıktısı son katman normu + çıktı matrisinden geçirilir (≈1–2 sn; arkadan çağrılır)
export function logitMercegi(m: ITurkceModel, s: ISonuc): IMercekSatiri[] {
    let { n_embd: C, vocab_size: V } = m.config;
    let g = m.t['ln_f.g'].f32!, b = m.t['ln_f.b'].f32!, W = m.t.wte;
    let t = s.n - 1, x = new Float32Array(C), out: IMercekSatiri[] = [];
    let logit = new Float32Array(V);
    s.bloklar.forEach((k, l) => {
        let r = satir(k.res2, t, C), ort = 0, vr = 0;
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
        out.push({ blok: l + 1, metin: m.tok.coz([en]), p: 1 / top });
    });
    return out;
}

// <|endoftext|> GPT-2'nin özel "metin sonu" parçası: öğrenciye ham hâli yerine anlamı gösterilir
export const okunur = (t: string) => t.replace('<|endoftext|>', EN ? '[end of text]' : '[metin sonu]').replace(/ /g, '·').replace(/\n/g, '¶');
// çok küçük sayılar (ör. ortalama ≈ 0,0003) "0,000" görünmesin
export const kucukSay = (v: number) => (v === 0 || Math.abs(v) >= 0.01 ? say(v, 3) : v.toLocaleString(YEREL, { maximumSignificantDigits: 2 }));
export const say = (v: number, b = 2) => v.toLocaleString(YEREL, { minimumFractionDigits: b, maximumFractionDigits: b });
// Türkçede yüzde işareti başta (%12,3), İngilizcede sonda (12.3%)
export const yuzde = (p: number, b = 1) => { let s = (p * 100).toLocaleString(YEREL, { maximumFractionDigits: b }); return EN ? s + '%' : '%' + s; };
