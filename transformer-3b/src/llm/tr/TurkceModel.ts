// TR: Türkçe GPT-2'yi (ytu-ce-cosmos/turkish-gpt2) tarayıcıda çalıştırır ve sonuçları 3B sahnenin dokularına yazar.
// Özgün llm-viz hesabı WASM'de (16 MB bellek) yapıyordu; GPT-2 boyutu sığmadığı için ileri geçiş burada, düz
// JavaScript'te (8 bit ağırlıklar, satır başına ölçek) yapılır. Tensör düzenleri GptModelWasm.ts ile aynıdır.
import { IBufferTex, createBufferTex as createBufferTex2, writeToBufferTex } from '@/src/utils/renderPhases';
import { IGptModelLink, IModelShape, IBlockLayerLink, ILayerNormLayerLink, ILinearLayerLink } from '../GptModel';
import { BaytBPE } from './bpe';
import { yol } from './yol';
import { sozlukGrubu, KANAL_ADIMI } from './ayarlar';
import { EN } from './dil';

// İngilizce sürüm özgün OpenAI GPT-2'yi aynı biçimde (scripts/agirlik_aktar.py openai-community/gpt2 gpt2-en-3b) indirir
export const HF_DEPO = 'https://huggingface.co/asy83/turkish-gpt2-explainer-onnx/resolve/main/' + (EN ? 'model-3b-en' : 'model-3b');
export const DOSYA = EN ? 'gpt2-en-3b.bin' : 'gpt2-tr-3b.bin';
export const PARCA_SAYISI = EN ? 16 : 12; // TR 124,4 MB, EN 163 MB (fp16 gömme) / 10 MiB

interface ITensor { sekil: number[]; i8?: Int8Array; olcek?: Float32Array; f32?: Float32Array; }

export interface ITurkceModel {
    config: { n_layer: number; n_head: number; n_embd: number; vocab_size: number; t_maks: number; kaynak: string };
    t: Record<string, ITensor>;
    tok: BaytBPE;
}

// ---------- yükleme ----------

async function getir(url: string, deneme = 3): Promise<ArrayBuffer> {
    for (let i = 0; ; i++) {
        try {
            let r = await fetch(url);
            if (!r.ok) {
                if (r.status >= 400 && r.status < 500) throw Object.assign(new Error(`${r.status} ${url}`), { kalici: true });
                throw new Error(`${r.status} ${url}`);
            }
            // Site, olmayan dosya için 404 yerine ana sayfayı (HTML, 200) döndürür: bunu "yok" say
            if ((r.headers.get('content-type') ?? '').includes('text/html')) {
                throw Object.assign(new Error(`dosya yok: ${url}`), { kalici: true });
            }
            let b = await r.arrayBuffer();
            if (htmlMi(b)) throw Object.assign(new Error(`dosya yok: ${url}`), { kalici: true });
            return b;
        } catch (e: any) {
            if (e?.kalici || i >= deneme - 1) throw e;
            await new Promise(c => setTimeout(c, 800 * (i + 1)));
        }
    }
}

function htmlMi(b: ArrayBuffer) {
    let bas = new TextDecoder().decode(new Uint8Array(b, 0, Math.min(15, b.byteLength))).trimStart().toLowerCase();
    return bas.startsWith('<!doctype') || bas.startsWith('<html');
}

async function parcalariGetir(onIlerleme: (oran: number) => void): Promise<Uint8Array> {
    let biten = 0;
    let onbellek: Cache | null = null;
    try { onbellek = await caches.open('transformer-3b-v1'); } catch { /* özel pencere vb. */ }
    let tekParca = async (i: number) => {
        let ad = `${DOSYA}.part${i}`;
        let adaylar = [`${HF_DEPO}/${ad}`, yol(`/model/${ad}`)];
        for (let url of adaylar) {
            try {
                let kayit = await onbellek?.match(url);
                if (kayit) {
                    let b = await kayit.arrayBuffer();
                    if (!htmlMi(b)) return b;
                    await onbellek?.delete(url); // önceden yanlışlıkla saklanmış HTML
                }
                let b = await getir(url);
                try { await onbellek?.put(url, new Response(b.slice(0))); } catch { /* yer yoksa geç */ }
                return b;
            } catch (e) {
                if (url === adaylar[adaylar.length - 1]) {
                    throw new Error(`Model dosyaları bulunamadı (${ad}). Ağırlıklar henüz Hugging Face'e yüklenmemiş olabilir.`);
                }
            }
        }
        throw new Error('parça alınamadı: ' + ad);
    };
    let parcalar: ArrayBuffer[] = new Array(PARCA_SAYISI);
    let sira = 0;
    let isci = async () => {
        while (sira < PARCA_SAYISI) {
            let i = sira++;
            parcalar[i] = await tekParca(i);
            biten++;
            onIlerleme(biten / PARCA_SAYISI);
        }
    };
    await Promise.all([isci(), isci(), isci(), isci()]);
    let toplam = parcalar.reduce((a, p) => a + p.byteLength, 0);
    let tum = new Uint8Array(toplam);
    let o = 0;
    for (let p of parcalar) { tum.set(new Uint8Array(p), o); o += p.byteLength; }
    return tum;
}

function f16ToF32(h: number) {
    let s = (h & 0x8000) >> 15, e = (h & 0x7c00) >> 10, f = h & 0x03ff;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    if (e === 0x1f) return f ? NaN : (s ? -1 : 1) * Infinity;
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

export function agirliklariAc(tum: Uint8Array) {
    let dv = new DataView(tum.buffer, tum.byteOffset, tum.byteLength);
    let n = dv.getUint32(0, true);
    let baslik = JSON.parse(new TextDecoder().decode(tum.subarray(4, 4 + n)));
    let veri = 4 + n;
    let t: Record<string, ITensor> = {};
    for (let d of baslik.tensorler) {
        let bas = tum.byteOffset + veri + d.ofset;
        if (d.tur === 'i8') {
            let satir = d.sekil[0];
            t[d.ad] = {
                sekil: d.sekil,
                i8: new Int8Array(tum.buffer, bas, d.bayt),
                olcek: new Float32Array(tum.buffer.slice(tum.byteOffset + veri + d.olcek_ofset, tum.byteOffset + veri + d.olcek_ofset + 4 * satir)),
            };
        } else {
            let u16 = new Uint16Array(tum.buffer.slice(bas, bas + d.bayt));
            let f = new Float32Array(u16.length);
            for (let i = 0; i < u16.length; i++) f[i] = f16ToF32(u16[i]);
            // İngilizce GPT-2'nin gömme tablosu fp16 saklanır (bkz. scripts/agirlik_aktar.py --wte16). Bütün kullanım
            // yerleri "i8[i] · olcek[satır]" okuduğu için tablo aynı alanlara, ölçek 1 ile konur (değerler zaten gerçek).
            if (d.ad === 'wte' && d.sekil.length === 2) t[d.ad] = { sekil: d.sekil, i8: f as unknown as Int8Array, olcek: new Float32Array(d.sekil[0]).fill(1) };
            else t[d.ad] = { sekil: d.sekil, f32: f };
        }
    }
    return { config: baslik.config, t };
}

export async function turkceModelYukle(onIlerleme: (oran: number) => void): Promise<ITurkceModel> {
    let [tum, tok] = await Promise.all([parcalariGetir(onIlerleme), BaytBPE.yukle(yol('/tokenizer/tokenizer.json'))]);
    let { config, t } = agirliklariAc(tum);
    return { config, t, tok };
}

// ---------- ileri geçiş ----------

function dogrusal(x: Float32Array, n: number, w: ITensor, b: Float32Array | null, out: Float32Array) {
    let [outD, inD] = w.sekil;
    let W = w.i8!, s = w.olcek!;
    for (let o = 0; o < outD; o++) {
        let wo = o * inD, so = s[o], bo = b ? b[o] : 0;
        for (let t = 0; t < n; t++) {
            let xo = t * inD, d0 = 0, d1 = 0, d2 = 0, d3 = 0, i = 0;
            for (; i + 3 < inD; i += 4) {
                d0 += x[xo + i] * W[wo + i];
                d1 += x[xo + i + 1] * W[wo + i + 1];
                d2 += x[xo + i + 2] * W[wo + i + 2];
                d3 += x[xo + i + 3] * W[wo + i + 3];
            }
            for (; i < inD; i++) d0 += x[xo + i] * W[wo + i];
            out[t * outD + o] = (d0 + d1 + d2 + d3) * so + bo;
        }
    }
}

function katmanNormu(x: Float32Array, n: number, C: number, g: Float32Array, b: Float32Array, out: Float32Array, agg: Float32Array) {
    for (let t = 0; t < n; t++) {
        let o = t * C, ort = 0;
        for (let c = 0; c < C; c++) ort += x[o + c];
        ort /= C;
        let v = 0;
        for (let c = 0; c < C; c++) { let d = x[o + c] - ort; v += d * d; }
        let sd = Math.sqrt(v / C + 1e-5);
        agg[t * 2] = ort; agg[t * 2 + 1] = sd;
        for (let c = 0; c < C; c++) out[o + c] = (x[o + c] - ort) / sd * g[c] + b[c];
    }
}

export interface ISonuc {
    n: number; T: number;
    ids: number[];
    x0: Float32Array;
    bloklar: {
        ln1: Float32Array; ln1agg: Float32Array; qkv: Float32Array; att: Float32Array; attagg: Float32Array; attsm: Float32Array;
        vout: Float32Array; proj: Float32Array; res1: Float32Array; ln2: Float32Array; ln2agg: Float32Array;
        fc: Float32Array; gelu: Float32Array; mproj: Float32Array; res2: Float32Array;
    }[];
    lnf: Float32Array; lnfagg: Float32Array;
    logits: Float32Array; smagg: Float32Array; sm: Float32Array; // (T, V)
}

export function ileri(m: ITurkceModel, ids: number[], T: number): ISonuc {
    let { n_layer: L, n_head: H, n_embd: C, vocab_size: V } = m.config;
    let A = C / H, n = Math.min(ids.length, T), W = m.t;
    let F = (k: number) => new Float32Array(k);
    let x = F(T * C);
    let wte = W.wte, wpe = W.wpe.f32!;
    for (let t = 0; t < n; t++) {
        let id = ids[t], s = wte.olcek![id];
        for (let c = 0; c < C; c++) x[t * C + c] = wte.i8![id * C + c] * s + wpe[t * C + c];
    }
    let sonuc: ISonuc = { n, T, ids: ids.slice(0, n), x0: x.slice(), bloklar: [], lnf: F(T * C), lnfagg: F(T * 2), logits: F(T * V), smagg: F(T * 2), sm: F(T * V) };
    let olcek = 1 / Math.sqrt(A);
    for (let l = 0; l < L; l++) {
        let p = `h${l}.`;
        let k = {
            ln1: F(T * C), ln1agg: F(T * 2), qkv: F(T * 3 * C), att: F(H * T * T), attagg: F(H * T * 2), attsm: F(H * T * T),
            vout: F(T * C), proj: F(T * C), res1: F(T * C), ln2: F(T * C), ln2agg: F(T * 2),
            fc: F(T * 4 * C), gelu: F(T * 4 * C), mproj: F(T * C), res2: F(T * C),
        };
        katmanNormu(x, n, C, W[p + 'ln_1.g'].f32!, W[p + 'ln_1.b'].f32!, k.ln1, k.ln1agg);
        dogrusal(k.ln1, n, W[p + 'attn.w'], W[p + 'attn.b'].f32!, k.qkv);
        let q3 = 3 * C;
        for (let h = 0; h < H; h++) {
            for (let t = 0; t < n; t++) {
                let sat = h * T * T + t * T, mx = -Infinity;
                for (let t2 = 0; t2 <= t; t2++) {
                    let d = 0, qo = t * q3 + h * A, ko = t2 * q3 + C + h * A;
                    for (let a = 0; a < A; a++) d += k.qkv[qo + a] * k.qkv[ko + a];
                    d *= olcek; k.att[sat + t2] = d; if (d > mx) mx = d;
                }
                let top = 0;
                for (let t2 = 0; t2 <= t; t2++) top += Math.exp(k.att[sat + t2] - mx);
                let ters = 1 / top;
                k.attagg[(h * T + t) * 2] = ters; k.attagg[(h * T + t) * 2 + 1] = mx;
                for (let t2 = 0; t2 <= t; t2++) k.attsm[sat + t2] = Math.exp(k.att[sat + t2] - mx) * ters;
                for (let a = 0; a < A; a++) {
                    let v = 0;
                    for (let t2 = 0; t2 <= t; t2++) v += k.attsm[sat + t2] * k.qkv[t2 * q3 + 2 * C + h * A + a];
                    k.vout[t * C + h * A + a] = v;
                }
            }
        }
        dogrusal(k.vout, n, W[p + 'proj.w'], W[p + 'proj.b'].f32!, k.proj);
        for (let i = 0; i < n * C; i++) k.res1[i] = x[i] + k.proj[i];
        katmanNormu(k.res1, n, C, W[p + 'ln_2.g'].f32!, W[p + 'ln_2.b'].f32!, k.ln2, k.ln2agg);
        dogrusal(k.ln2, n, W[p + 'fc.w'], W[p + 'fc.b'].f32!, k.fc);
        let c0 = Math.sqrt(2 / Math.PI);
        for (let i = 0; i < n * 4 * C; i++) { let v = k.fc[i]; k.gelu[i] = 0.5 * v * (1 + Math.tanh(c0 * (v + 0.044715 * v * v * v))); }
        dogrusal(k.gelu, n, W[p + 'mproj.w'], W[p + 'mproj.b'].f32!, k.mproj);
        for (let i = 0; i < n * C; i++) k.res2[i] = k.res1[i] + k.mproj[i];
        x = k.res2;
        sonuc.bloklar.push(k);
    }
    katmanNormu(x, n, C, W['ln_f.g'].f32!, W['ln_f.b'].f32!, sonuc.lnf, sonuc.lnfagg);
    dogrusal(sonuc.lnf, n, wte, null, sonuc.logits);
    for (let t = 0; t < n; t++) {
        let o = t * V, mx = -Infinity, top = 0;
        for (let v = 0; v < V; v++) if (sonuc.logits[o + v] > mx) mx = sonuc.logits[o + v];
        for (let v = 0; v < V; v++) { let e = Math.exp(sonuc.logits[o + v] - mx); sonuc.sm[o + v] = e; top += e; }
        for (let v = 0; v < V; v++) sonuc.sm[o + v] /= top;
        sonuc.smagg[t * 2] = mx; sonuc.smagg[t * 2 + 1] = top;
    }
    return sonuc;
}

// ---------- 3B sahne bağlantısı ----------

// Sözlük boyutlu dokular (50.257) hem ekran kartının en büyük doku boyunu aşar hem sahnede dev bir duvar olur:
// k satırda bir örneklenir (ağırlık) ya da k'lık gruplardaki en büyük değer alınır (logit, olasılık).
// Yerleşim (GptModelLayout) sözlük eksenini aynı k ile Vg hücre olarak çizer (sozlukGrubu).
export interface ITurkceLink extends IGptModelLink {
    vocabK: number;
    turkce: ITurkceModel;
    sonuc: ISonuc | null;
}

function tex(gl: WebGL2RenderingContext, h: number, w: number, ch: number) {
    return createBufferTex2(gl, w, h, ch);
}

function ln(gl: WebGL2RenderingContext, T: number, C: number): ILayerNormLayerLink {
    return { normWeight: tex(gl, C, 1, 1), normBias: tex(gl, C, 1, 1), normAgg: tex(gl, T, 1, 2), output: tex(gl, T, C, 1) };
}

function lin(gl: WebGL2RenderingContext, T: number, cIn: number, cOut: number): ILinearLayerLink {
    return { weight: tex(gl, cOut, cIn, 1), bias: tex(gl, cOut, 1, 1), output: tex(gl, T, cOut, 1) };
}

export function turkceLinkOlustur(gl: WebGL2RenderingContext, m: ITurkceModel, T: number): ITurkceLink {
    let { n_layer: L, n_head: H, n_embd: Cg, vocab_size: V } = m.config;
    // TR: dokular sahnede çizilen boyutta (özet görünümde her KANAL_ADIMI'ncı kanal); hesap tam boyutta yapılır
    let C = Cg / KANAL_ADIMI;
    let A = C / H;
    let enBuyuk = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 16384);
    let k = Math.max(sozlukGrubu(V), Math.ceil(V / enBuyuk));
    let Vk = Math.ceil(V / k);
    let shape: IModelShape = { B: 1, C, nHeads: H, T, A, nBlocks: L, vocabSize: V };
    let bloklar: IBlockLayerLink[] = [];
    for (let l = 0; l < L; l++) {
        let attnAdd = { output: tex(gl, T, C, 1) };
        let mlpAdd = { output: tex(gl, T, C, 1) };
        let mlp = { fcLayer: lin(gl, T, C, 4 * C), mlpGelu: tex(gl, T, 4 * C, 1), projLayer: lin(gl, T, 4 * C, C), addLayer: mlpAdd, output: mlpAdd.output };
        bloklar.push({
            ln_1: ln(gl, T, C),
            attn: {
                qkvWeight: tex(gl, 3 * C, C, 1), qkvBias: tex(gl, 3 * C, 1, 1),
                attnMatrix: tex(gl, H * T, T, 1), attnMatrixAgg: tex(gl, H * T, 1, 2), attnMatrixSoftmax: tex(gl, H * T, T, 1),
                qkvOutput: tex(gl, T, 3 * C, 1), add: attnAdd, proj: lin(gl, T, C, C), scaledVectors: tex(gl, T, C, 1), output: attnAdd.output,
            },
            ln_2: ln(gl, T, C),
            mlp,
            output: mlpAdd.output,
        });
    }
    let softmaxFinal = { agg: tex(gl, T, 1, 2), output: tex(gl, T, Vk, 1) };
    let link: ITurkceLink = {
        gl, inputBuf: new Float32Array(T), inputTokens: tex(gl, T, 1, 1),
        vocabEmbed: { weight: tex(gl, Vk, C, 1), output: tex(gl, T, C, 1) },
        posEmbed: { weight: tex(gl, T, C, 1), output: tex(gl, T, C, 1) },
        add: { output: tex(gl, T, C, 1) },
        blocks: bloklar,
        ln_f: ln(gl, T, C),
        lm_head: { weight: tex(gl, Vk, C, 1), bias: null, output: tex(gl, T, Vk, 1) },
        softmaxFinal,
        shape,
        output: softmaxFinal.output,
        resultBuf: null, sortedBuf: null,
        vocabK: k, turkce: m, sonuc: null,
        inputLen: 0,
    } as ITurkceLink;
    agirliklariYaz(link);
    return link;
}

function yaz(t: IBufferTex, veri: Float32Array, gl: WebGL2RenderingContext, sakla = true) {
    if (sakla) t.localBuffer = veri;
    writeToBufferTex(gl, t, veri);
}

// 8 bit tensörü açarak dokuya yazar. Büyük ağırlıklarda yerel kopya tutulmaz; değer sorulursa anında açılır.
function i8Yaz(t: IBufferTex, w: ITensor, gl: WebGL2RenderingContext) {
    let [satir, sutun] = w.sekil;
    let f = new Float32Array(satir * sutun);
    for (let r = 0; r < satir; r++) {
        let s = w.olcek![r], o = r * sutun;
        for (let c = 0; c < sutun; c++) f[o + c] = w.i8![o + c] * s;
    }
    writeToBufferTex(gl, t, f);
    t.localBuffer = i8Gorunum(w);
}

function i8Gorunum(w: ITensor): Float32Array {
    let [satir, sutun] = w.sekil;
    let uzunluk = satir * sutun;
    return new Proxy({ length: uzunluk } as any, {
        get(hedef, ad) {
            if (typeof ad === 'string' && /^\d+$/.test(ad)) {
                let i = +ad;
                return w.i8![i] * w.olcek![Math.floor(i / sutun)];
            }
            return hedef[ad];
        },
    }) as Float32Array;
}

// ---------- özet görünüm: kanal seyreltme ----------
// Kanal j (sahnede) = gerçek kanal j·d. GPT-2'de baş boyutu 64 olduğundan d = 8 seçilince baş h'nin 64 boyutundan
// 8'i (h·64, h·64+8, …) görünür ve bunlar sahnedeki kanal sırasıyla (h·8 … h·8+7) birebir örtüşür. Q/K/V, MLP ve
// izdüşüm tensörleri de aynı kurala uyar; böylece sahnedeki her hücre modeldeki gerçek bir sayıdır.

const aralik = (n: number, d = 1, bas = 0) => Array.from({ length: Math.ceil(n / d) }, (_, i) => bas + i * d);

interface IKanallar { C: number[]; C3: number[]; C4: number[]; }
function kanallar(Cg: number): IKanallar {
    let d = KANAL_ADIMI, C = aralik(Cg, d);
    return { C, C3: [0, 1, 2].flatMap(p => C.map(c => p * Cg + c)), C4: aralik(4 * Cg, d) };
}

// (satır, sütun) seçimiyle alt matris: f32 ya da 8 bit (satır başına ölçek)
function secF32(veri: ArrayLike<number>, genislik: number, satirlar: number[], sutunlar: number[]) {
    let out = new Float32Array(satirlar.length * sutunlar.length), i = 0;
    for (let r of satirlar) { let o = r * genislik; for (let c of sutunlar) out[i++] = veri[o + c]; }
    return out;
}
function secI8(w: ITensor, satirlar: number[], sutunlar: number[]) {
    let gen = w.sekil[1], out = new Float32Array(satirlar.length * sutunlar.length), i = 0;
    for (let r of satirlar) { let o = r * gen, sc = w.olcek![r]; for (let c of sutunlar) out[i++] = w.i8![o + c] * sc; }
    return out;
}
const sec1 = (veri: ArrayLike<number>, idx: number[]) => Float32Array.from(idx, i => veri[i]);

function agirliklariYaz(link: ITurkceLink) {
    let { gl, turkce: m, vocabK: k } = link;
    let { n_embd: Cg, vocab_size: V } = m.config;
    let T = link.shape.T, W = m.t;
    let K = kanallar(Cg), tum = KANAL_ADIMI === 1;
    // sözlük gömmesi: k satırda bir
    let Vk = link.vocabEmbed.weight.height;
    let wte = secI8(W.wte, aralik(Vk).map(r => Math.min(r * k, V - 1)), K.C);
    yaz(link.vocabEmbed.weight, wte, gl);
    yaz(link.lm_head.weight, wte, gl);
    yaz(link.posEmbed.weight, secF32(W.wpe.f32!, Cg, aralik(T), K.C), gl);
    // Gerçek boyutta büyük ağırlıklar için yerel kopya tutulmaz (i8Yaz); özette küçük oldukları için doğrudan yazılır
    let agirlik = (t: IBufferTex, w: ITensor, sat: number[], sut: number[]) => tum ? i8Yaz(t, w, gl) : yaz(t, secI8(w, sat, sut), gl);
    let vektor = (t: IBufferTex, v: Float32Array, idx: number[]) => yaz(t, tum ? v : sec1(v, idx), gl);
    link.blocks.forEach((b, l) => {
        let p = `h${l}.`;
        vektor(b.ln_1.normWeight, W[p + 'ln_1.g'].f32!, K.C); vektor(b.ln_1.normBias, W[p + 'ln_1.b'].f32!, K.C);
        agirlik(b.attn.qkvWeight, W[p + 'attn.w'], K.C3, K.C); vektor(b.attn.qkvBias, W[p + 'attn.b'].f32!, K.C3);
        agirlik(b.attn.proj.weight, W[p + 'proj.w'], K.C, K.C); vektor(b.attn.proj.bias!, W[p + 'proj.b'].f32!, K.C);
        vektor(b.ln_2.normWeight, W[p + 'ln_2.g'].f32!, K.C); vektor(b.ln_2.normBias, W[p + 'ln_2.b'].f32!, K.C);
        agirlik(b.mlp.fcLayer.weight, W[p + 'fc.w'], K.C4, K.C); vektor(b.mlp.fcLayer.bias!, W[p + 'fc.b'].f32!, K.C4);
        agirlik(b.mlp.projLayer.weight, W[p + 'mproj.w'], K.C, K.C4); vektor(b.mlp.projLayer.bias!, W[p + 'mproj.b'].f32!, K.C);
    });
    vektor(link.ln_f.normWeight, W['ln_f.g'].f32!, K.C); vektor(link.ln_f.normBias, W['ln_f.b'].f32!, K.C);
}

// Sözlük ekseni k'lık gruplarda en büyük değer
function grupMaks(veri: Float32Array, T: number, V: number, k: number) {
    let Vk = Math.ceil(V / k), out = new Float32Array(T * Vk);
    for (let t = 0; t < T; t++)
        for (let r = 0; r < Vk; r++) {
            let mx = -Infinity;
            for (let j = r * k; j < Math.min(V, r * k + k); j++) if (veri[t * V + j] > mx) mx = veri[t * V + j];
            out[t * Vk + r] = mx === -Infinity ? 0 : mx;
        }
    return out;
}

export function sonuclariYaz(link: ITurkceLink, s: ISonuc) {
    let { gl } = link;
    let { T, vocabSize: V } = link.shape;
    link.sonuc = s;
    let girdi = new Float32Array(T);
    s.ids.forEach((id, i) => (girdi[i] = id));
    link.inputBuf = girdi;
    (link as any).inputLen = s.n;
    yaz(link.inputTokens, girdi, gl);
    let Cg = link.turkce.config.n_embd, K = kanallar(Cg), tum = KANAL_ADIMI === 1, satir = aralik(T);
    // (T, genişlik) tensörü sahnedeki kanallarla
    let tk = (v: Float32Array, idx: number[], gen: number) => tum ? v : secF32(v, gen, satir, idx);
    let tokEmb = new Float32Array(T * Cg);
    let posEmb = new Float32Array(T * Cg);
    let wte = link.turkce.t.wte, wpe = link.turkce.t.wpe.f32!;
    for (let t = 0; t < s.n; t++) {
        let id = s.ids[t], sc = wte.olcek![id];
        for (let c = 0; c < Cg; c++) { tokEmb[t * Cg + c] = wte.i8![id * Cg + c] * sc; posEmb[t * Cg + c] = wpe[t * Cg + c]; }
    }
    let C1 = (v: Float32Array) => tk(v, K.C, Cg);
    yaz(link.vocabEmbed.output, C1(tokEmb), gl);
    yaz(link.posEmbed.output, C1(posEmb), gl);
    yaz(link.add.output, C1(s.x0), gl);
    link.blocks.forEach((b, l) => {
        let k = s.bloklar[l];
        yaz(b.ln_1.normAgg, k.ln1agg, gl); yaz(b.ln_1.output, C1(k.ln1), gl);
        yaz(b.attn.qkvOutput, tk(k.qkv, K.C3, 3 * Cg), gl);
        yaz(b.attn.attnMatrix, k.att, gl); yaz(b.attn.attnMatrixAgg, k.attagg, gl); yaz(b.attn.attnMatrixSoftmax, k.attsm, gl);
        yaz(b.attn.scaledVectors, C1(k.vout), gl);
        yaz(b.attn.proj.output, C1(k.proj), gl); yaz(b.attn.output, C1(k.res1), gl);
        yaz(b.ln_2.normAgg, k.ln2agg, gl); yaz(b.ln_2.output, C1(k.ln2), gl);
        yaz(b.mlp.fcLayer.output, tk(k.fc, K.C4, 4 * Cg), gl); yaz(b.mlp.mlpGelu, tk(k.gelu, K.C4, 4 * Cg), gl);
        yaz(b.mlp.projLayer.output, C1(k.mproj), gl); yaz(b.mlp.addLayer.output, C1(k.res2), gl);
    });
    yaz(link.ln_f.normAgg, s.lnfagg, gl); yaz(link.ln_f.output, C1(s.lnf), gl);
    yaz(link.lm_head.output, grupMaks(s.logits, T, V, link.vocabK), gl);
    yaz(link.softmaxFinal.agg, s.smagg, gl);
    yaz(link.softmaxFinal.output, grupMaks(s.sm, T, V, link.vocabK), gl);
    link.resultBuf = s.sm;
    // Model kartının "Çıktı" kutuları için: her konumda en olası 12 parça, sıralı (düzen: (t, sıra) → [id, olasılık])
    let sirali = new Float32Array(T * V * 2);
    for (let t = 0; t < s.n; t++) {
        let enIyi: { id: number; p: number }[] = [];
        for (let v = 0; v < V; v++) {
            let p = s.sm[t * V + v];
            if (enIyi.length < 12 || p > enIyi[enIyi.length - 1].p) {
                enIyi.push({ id: v, p }); enIyi.sort((a, b) => b.p - a.p); if (enIyi.length > 12) enIyi.pop();
            }
        }
        enIyi.forEach((e, j) => { sirali[(t * V + j) * 2] = e.id; sirali[(t * V + j) * 2 + 1] = e.p; });
    }
    link.sortedBuf = sirali;
}

// En olası token'lar (son konum ya da verilen konum için)
export function enOlasilar(link: ITurkceLink, t: number, adet = 10) {
    let s = link.sonuc;
    if (!s) return [];
    let V = link.shape.vocabSize, o = t * V;
    let enIyi: { id: number; p: number }[] = [];
    for (let v = 0; v < V; v++) {
        let p = s.sm[o + v];
        if (enIyi.length < adet || p > enIyi[enIyi.length - 1].p) {
            enIyi.push({ id: v, p });
            enIyi.sort((a, b) => b.p - a.p);
            if (enIyi.length > adet) enIyi.pop();
        }
    }
    return enIyi.map(({ id, p }) => ({ id, p, metin: link.turkce.tok.coz([id]) }));
}
