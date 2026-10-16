// TR: Odak modu. Anlatımın her bölümünde yalnızca o bölümün konu ettiği bloklar net görünür; diğerleri silikleşir
// (oklar ve etiketleri de onlarla birlikte). Özet görünümde sahnede tek Transformer bloğu çizilir ve yanına
// "× 12" notu düşülür. Açık/kapalı tercihi tarayıcıda saklanır.
import { Vec3, Vec4 } from '@/src/utils/vector';
import { IProgramState } from '../Program';
import { IBlkDef } from '../GptModelLayout';
import { Phase } from '../walkthrough/Walkthrough';
import { drawTextOnModel, TextAlignHoriz, TextAlignVert } from '../Annotations';
import { GERCEK, OZET } from './ayarlar';

const ANAHTAR = 'transformer-3b-odak';
const SILIK = 0.05;

function oku(): boolean {
    try { return typeof window === 'undefined' || window.localStorage.getItem(ANAHTAR) !== '0'; } catch { return true; }
}

export const odak = { acik: oku() };

export function odakAyarla(acik: boolean) {
    odak.acik = acik;
    try { window.localStorage.setItem(ANAHTAR, acik ? '1' : '0'); } catch { /* özel pencere */ }
}

// Bölümün odak blokları (silikleştirme ve kamera çerçevesi için)
export function odakBloklari(state: IProgramState): IBlkDef[] | null {
    let L = state.layout, b = L.blocks[0];
    switch (state.walkthrough.phase) {
        case Phase.Input_Detail_Embedding:
            return [L.idxObj, L.tokEmbedObj, L.posEmbedObj, L.residual0];
        case Phase.Input_Detail_LayerNorm:
            return [L.residual0, ...b.ln1.cubes];
        case Phase.Input_Detail_SelfAttention:
            return [b.ln1.lnResid, ...b.heads[Math.min(2, b.heads.length - 1)].cubes];
        case Phase.Input_Detail_Projection:
            return [...b.heads.map(h => h.vOutBlock), b.projBias, b.projWeight, b.attnOut, b.attnResidual];
        case Phase.Input_Detail_Mlp:
            return [b.ln2.lnResid, b.mlpAct, b.mlpFc, b.mlpFcBias, b.mlpFcWeight, b.mlpProjBias, b.mlpProjWeight, b.mlpResult, b.mlpResidual];
        case Phase.Input_Detail_Softmax:
        case Phase.Input_Detail_Output:
            return [...L.ln_f.cubes, L.lmHeadWeight, L.logits, L.logitsAgg1, L.logitsAgg2, L.logitsSoftmax];
        default:
            return null; // genel bakış, ön bilgi, Transformer bloğu: bütün model
    }
}

// Odak bloklarını ekrana sığdıran kamera: bakılan nokta (dünya koordinatı) ve uzaklık (angle.z = uzaklık / 200).
// Görüş açısı 40° (Camera.ts). Sağ alttaki panel ve sol alttaki kutu alt köşeleri kapladığı için çerçeve biraz geniş.
export function odakKamerasi(state: IProgramState): { merkez: Vec3; z: number } | null {
    let bloklar = odakBloklari(state)?.filter(b => b && b.dx > 0);
    if (!bloklar || bloklar.length === 0) return null;
    let mn = new Vec3(Infinity, Infinity, Infinity), mx = new Vec3(-Infinity, -Infinity, -Infinity);
    for (let b of bloklar) {
        mn = new Vec3(Math.min(mn.x, b.x), Math.min(mn.y, b.y), Math.min(mn.z, b.z));
        mx = new Vec3(Math.max(mx.x, b.x + b.dx), Math.max(mx.y, b.y + b.dy), Math.max(mx.z, b.z + b.dz));
    }
    if (state.walkthrough.phase === Phase.Input_Detail_SelfAttention) {
        // Bölüm, izlenen başı normalizasyon sütununun düzlemine çekip Q/K/V'yi üst üste dizer
        // (Walkthrough04: focusSelfAttentionHead). Çerçeve bu son düzene göre: derinlik = sütunun düzlemi,
        // üst sınır = Q'nun yeni yeri.
        let L = state.layout, b = L.blocks[0], h = b.heads[Math.min(2, b.heads.length - 1)];
        let adim = h.qBlock.dy + L.margin;
        mn = new Vec3(mn.x, Math.min(mn.y, h.qBlock.y - 2 * adim), b.ln1.lnResid.z);
        mx = new Vec3(mx.x, mx.y, b.ln1.lnResid.z + b.ln1.lnResid.dz);
    }
    let boy = mx.sub(mn), orta = mn.add(boy.mul(0.5));
    let tan = Math.tan(20 * Math.PI / 180);
    let en = Math.max(1, state.render.size.x / Math.max(1, state.render.size.y));
    // dikkat başı ince ve uzun (Q/K/V ağırlıkları yan yana); biraz daha yakından bak
    let pay = 1.35;
    let d = Math.max(boy.y / 2 / tan, boy.x / 2 / (tan * en)) * pay + boy.z / 2;
    // aşağıya doğru biraz kaydır: alt köşelerdeki kutular sahnenin altını örter
    let merkez = new Vec3(orta.x, -orta.z, -(orta.y + boy.y * 0.12));
    return { merkez, z: Math.max(d, 150) / 200 };
}

// runWalkthrough'tan sonra, oklar ve etiketler çizilmeden önce çağrılır (onlar blok saydamlığını izler)
export function odakUygula(state: IProgramState, tabanKupSayisi: number) {
    if (!odak.acik) return;
    let bloklar = odakBloklari(state);
    if (bloklar && state.walkthrough.phase === Phase.Input_Detail_SelfAttention) bloklar = [...bloklar, state.layout.residual0];
    if (!bloklar || bloklar.length === 0) return;
    let tut = new Set(bloklar);
    // anlatımın animasyon için eklediği kopya bloklar (sona eklenir) silikleşmez
    let kupler = state.layout.cubes;
    for (let i = 0; i < Math.min(tabanKupSayisi, kupler.length); i++) {
        if (!tut.has(kupler[i])) kupler[i].opacity *= SILIK;
    }
}

// Özet görünümde tek blok çizilir; tekrar sayısını sahnede belirt
export function tekrarNotu(state: IProgramState) {
    let L = state.layout;
    if (!OZET || L.blocks.length !== 1) return;
    let b = L.blocks[0];
    let x = b.mlpResidual.x + b.mlpResidual.dx + L.margin * 1.5;
    let ust = b.attnResidual.y;
    let alt = b.mlpResidual.y + b.mlpResidual.dy;
    let renk = new Vec4(0.78, 0.06, 0.18, 1);
    drawTextOnModel(state.render, `× ${GERCEK.nBlocks}`, new Vec3(x, (ust + alt) / 2, 0), {
        align: TextAlignHoriz.Left, valign: TextAlignVert.Bottom, color: renk, size: 26,
    });
    drawTextOnModel(state.render, `Bu blok ${GERCEK.nBlocks} kez art arda tekrarlanır;`, new Vec3(x, (ust + alt) / 2 + 4, 0), {
        align: TextAlignHoriz.Left, valign: TextAlignVert.Top, color: new Vec4(0.2, 0.2, 0.2, 1), size: 6,
    });
    drawTextOnModel(state.render, `sahnede yalnızca 1. blok gösteriliyor.`, new Vec3(x, (ust + alt) / 2 + 12, 0), {
        align: TextAlignHoriz.Left, valign: TextAlignVert.Top, color: new Vec4(0.2, 0.2, 0.2, 1), size: 6,
    });
}
