// TR: Özgün anlatımın kamera konumları nano-gpt (C = 48, 3 blok) için elle yazılmıştı. Türkçe GPT-2'de (C = 768,
// 12 blok) aynı kareyi bulmak için: kameranın baktığı nokta nano yerleşiminde hangi bloğun neresine düşüyorsa,
// GPT-2 yerleşiminde aynı adlı bloğun aynı oranlı noktasına taşınır; uzaklık blok boyları oranında büyütülür.
import { Vec3 } from '@/src/utils/vector';
import { genGptModelLayout, IBlkDef, IGptModelLayout } from '../GptModelLayout';
import { IModelShape } from '../GptModel';

const NANO: IModelShape = { B: 1, T: 11, C: 48, nHeads: 3, A: 16, nBlocks: 3, vocabSize: 3 };

let nanoOnbellek: { layout: IGptModelLayout; yollar: Map<string, IBlkDef> } | null = null;
let hedefOnbellek = new WeakMap<object, Map<string, IBlkDef>>();
// Hedef yerleşim her karede yeniden üretilir; şekil aynı kaldıkça yol haritası aynıdır (blok konumları değişmez)
let sekilOnbellek: { anahtar: string; yollar: Map<string, IBlkDef> } | null = null;

function blokMu(o: any): o is IBlkDef {
    return o && typeof o === 'object' && typeof o.cx === 'number' && typeof o.dx === 'number' && typeof o.t === 'string';
}

function yollariTopla(layout: IGptModelLayout) {
    let yollar = new Map<string, IBlkDef>();
    let gorulen = new Set<any>();
    let gez = (o: any, yol: string, derinlik: number) => {
        if (!o || typeof o !== 'object' || gorulen.has(o) || derinlik > 5) return;
        gorulen.add(o);
        if (blokMu(o)) { if (!yollar.has(yol)) yollar.set(yol, o); return; }
        for (let k of Object.keys(o)) {
            if (k === 'cubes' || k === 'model' || k === 'labels' || k === 'deps' || k === 'access' || k === 'subs') continue;
            gez(o[k], yol ? `${yol}.${k}` : k, derinlik + 1);
        }
    };
    gez(layout, '', 0);
    return yollar;
}

function nano() {
    if (!nanoOnbellek) {
        let layout = genGptModelLayout(NANO);
        nanoOnbellek = { layout, yollar: yollariTopla(layout) };
    }
    return nanoOnbellek;
}

function kutu(b: IBlkDef) {
    return { min: new Vec3(b.x, b.y, b.z), boy: new Vec3(b.dx, b.dy, b.dz) };
}

function uzaklik(p: Vec3, b: IBlkDef) {
    let dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.dx));
    let dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.dy));
    let dz = Math.max(b.z - p.z, 0, p.z - (b.z + b.dz));
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function tumKutu(yollar: Map<string, IBlkDef>) {
    let mn = new Vec3(Infinity, Infinity, Infinity), mx = new Vec3(-Infinity, -Infinity, -Infinity);
    for (let b of yollar.values()) {
        mn = new Vec3(Math.min(mn.x, b.x), Math.min(mn.y, b.y), Math.min(mn.z, b.z));
        mx = new Vec3(Math.max(mx.x, b.x + b.dx), Math.max(mx.y, b.y + b.dy), Math.max(mx.z, b.z + b.dz));
    }
    return { min: mn, boy: mx.sub(mn) };
}

// dünya → model: modelMtx (Camera.ts) dünya = (x, -z, -y)
const dunyadanModele = (c: Vec3) => new Vec3(c.x, -c.z, -c.y);
const modeldenDunyaya = (p: Vec3) => new Vec3(p.x, -p.z, -p.y);

function oranla(p: Vec3, a: { min: Vec3; boy: Vec3 }, b: { min: Vec3; boy: Vec3 }) {
    let f = (i: 'x' | 'y' | 'z') => a.boy[i] > 1e-6 ? (p[i] - a.min[i]) / a.boy[i] : 0.5;
    return new Vec3(b.min.x + f('x') * b.boy.x, b.min.y + f('y') * b.boy.y, b.min.z + f('z') * b.boy.z);
}

export function kameraUyarla(hedef: IGptModelLayout, merkez: Vec3, aci: Vec3): { merkez: Vec3; aci: Vec3 } {
    let { yollar: nanoYollar } = nano();
    let s = hedef.shape;
    let anahtar = `${s.T}-${s.C}-${s.nHeads}-${s.nBlocks}-${s.vocabSize}`;
    if (s.C === NANO.C && s.T === NANO.T && s.nBlocks === NANO.nBlocks) return { merkez, aci };
    if (!sekilOnbellek || sekilOnbellek.anahtar !== anahtar) sekilOnbellek = { anahtar, yollar: yollariTopla(hedef) };
    let hedefYollar = sekilOnbellek.yollar;

    let p = dunyadanModele(merkez);
    let kameraUzakligi = 200 * aci.z;

    // nano'nun son bloğu (blocks.2) GPT-2'nin son bloğuna (blocks.11) karşılık gelir
    let hedefYol = (yol: string) => yol.replace(/^blocks\.2\./, `blocks.${s.nBlocks - 1}.`);

    // en uygun nano bloğu: içinde olunan en küçük blok, yoksa en yakını
    let enIyi: { yol: string; b: IBlkDef; puan: number } | null = null;
    for (let [yol, b] of nanoYollar) {
        if (!hedefYollar.has(hedefYol(yol)) || b.dx * b.dy === 0) continue;
        let d = uzaklik(p, b);
        let hacim = b.dx * b.dy + b.dy * b.dz + b.dx * b.dz;
        let puan = d * 1000 + Math.sqrt(hacim);
        if (!enIyi || puan < enIyi.puan) enIyi = { yol, b, puan };
    }

    let tumNano = tumKutu(nanoYollar), tumHedef = tumKutu(hedefYollar);
    let genelOran = tumHedef.boy.y / Math.max(tumNano.boy.y, 1e-6);

    // genel görünüm: kamera uzaksa ya da yakın blok yoksa tüm model oranında taşı
    let blokBoyu = enIyi ? Math.max(enIyi.b.dx, enIyi.b.dy, enIyi.b.dz) : 0;
    if (!enIyi || kameraUzakligi > 6 * blokBoyu || uzaklik(p, enIyi.b) > 2 * blokBoyu) {
        let yeni = oranla(p, tumNano, tumHedef);
        return { merkez: modeldenDunyaya(yeni), aci: new Vec3(aci.x, aci.y, aci.z * genelOran) };
    }

    let hb = hedefYollar.get(hedefYol(enIyi.yol))!;
    let yeni = oranla(p, kutu(enIyi.b), kutu(hb));
    let oran = Math.max(hb.dx, hb.dy, hb.dz) / Math.max(blokBoyu, 1e-6);
    oran = Math.min(Math.max(oran, 1), 24);
    return { merkez: modeldenDunyaya(yeni), aci: new Vec3(aci.x, aci.y, aci.z * oran) };
}
