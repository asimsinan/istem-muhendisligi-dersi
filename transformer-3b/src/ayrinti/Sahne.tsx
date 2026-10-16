'use client';
// TR: Ayrıntılı sinematik 3B sahne: bir Transformer bloğunun matris işlemleri, gerçek sayılarla.
// Her adımın kendi tahtası var; matrisler parlayan hücre ızgaraları, çarpımlarda satır × sütun taraması.
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Sparkles, Text } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { IDurum, Saat, ara, sinir, yumusak } from '../hikaye/akis';
import { IHikayeVeri, okunur, say, yuzde } from '../hikaye/veri';
import { yol } from '@/src/llm/tr/yol';
import { AYRINTI_ADIMLARI, H, IDuzen, duzen, tarama } from './akis';
import { GA, GC, GF, GV, IAyrintiVeri, Mat, sicaklikliOlasilik } from './veri';
import { ipucu } from './ipucu';
import { L, YEREL } from '../llm/tr/dil';

const FONT = yol('/fonts/hikaye/Inter-600.ttf');
const FONT_INCE = yol('/fonts/hikaye/Inter-400.ttf');

const R = {
    zemin: '#070b17',
    odak: new THREE.Color('#ff3b5c'),
    veriArti: new THREE.Color('#33e0b0'),
    veriEksi: new THREE.Color('#ff5c8a'),
    agArti: new THREE.Color('#6c8cff'),
    agEksi: new THREE.Color('#ffb347'),
    olasilik: new THREE.Color('#ffd166'),
    sonuk: new THREE.Color('#1a2242'),
    maske: new THREE.Color('#5a0f24'),
    beyaz: new THREE.Color('#ffffff'),
    yazi: '#e8ecff',
    ikincil: '#8f9bc7',
};

type Tur = 'veri' | 'agirlik' | 'olasilik';
type Konum = [number, number] | [number, number, number];
type Gor = (d: IDurum) => number;

function renk(v: number, mx: number, tur: Tur, out: THREE.Color) {
    if (tur === 'olasilik') {
        let a = sinir(v);
        return out.copy(R.sonuk).lerp(R.olasilik, Math.sqrt(a)).multiplyScalar(0.9 + 1.5 * a);
    }
    let a = sinir(Math.abs(v) / Math.max(mx, 1e-9));
    let c = tur === 'veri' ? (v >= 0 ? R.veriArti : R.veriEksi) : (v >= 0 ? R.agArti : R.agEksi);
    return out.copy(c).multiplyScalar(0.1 + 1.25 * Math.pow(a, 0.8));
}

const KUTU = new THREE.BoxGeometry(1, 1, 1);

// Grup içindeki bütün yazıların saydamlığı (troika Text)
function yazilariSoldur(g: THREE.Object3D, a: number) {
    g.traverse((o: any) => {
        if (o.isTroikaText || o.fillOpacity !== undefined) { o.fillOpacity = a; o.outlineOpacity = a * 0.8; }
    });
}

// ---------- matris ----------

interface IVurgu { satir?: number; sutun?: number; hucre?: [number, number] }

const Matris: React.FC<{
    saat: Saat; konum: Konum; deger: Mat; tur: Tur;
    baslik?: string; alt?: string; satirEtiket?: string[]; sutunEtiket?: string[]; odakSatir?: number;
    metin?: boolean; bicim?: (v: number) => string;
    gorunur: Gor; dolum?: (d: IDurum) => number; ucgen?: boolean; maske?: Gor;
    vurgu?: (d: IDurum) => IVurgu | null;
    aciklama: (i: number, j: number, v: number) => string;
}> = ({ saat, konum, deger, tur, baslik, alt, satirEtiket, sutunEtiket, odakSatir, metin, bicim, gorunur, dolum, ucgen, maske, vurgu, aciklama }) => {
    let satir = deger.length, sutun = deger[0]?.length ?? 0, N = satir * sutun;
    let [x0, y0, z0 = 0] = konum as number[];
    let ref = useRef<THREE.InstancedMesh>(null);
    let mat = useRef<THREE.MeshBasicMaterial>(null);
    let grup = useRef<THREE.Group>(null);
    let yazilar = useRef<any[]>([]);
    let son = useRef({ anahtar: '', a: -1 });
    let c = useMemo(() => new THREE.Color(), []);
    let m4 = useMemo(() => new THREE.Matrix4(), []);
    let mx = useMemo(() => {
        let e = 1e-9;
        deger.forEach((r, i) => r.forEach((v, j) => { if (!ucgen || j <= i) e = Math.max(e, Math.abs(v)); }));
        return e;
    }, [deger, ucgen]);
    let sira = (i: number, j: number) => ucgen ? i * (i + 1) / 2 + j : i * sutun + j;
    let maskeli = (i: number, j: number) => !!ucgen && j > i;
    let bc = bicim ?? ((v: number) => say(v, Math.abs(v) >= 10 ? 1 : 2));

    useFrame(() => {
        let d = saat.durum, a = gorunur(d), g = grup.current, o = ref.current;
        if (!g || !o) return;
        g.visible = a > 0.01;
        if (!g.visible) { son.current.a = 0; return; }
        if (Math.abs(a - son.current.a) > 0.01) { son.current.a = a; if (mat.current) mat.current.opacity = a; yazilariSoldur(g, a); }
        let dol = dolum ? dolum(d) : 1e9;
        let vg = vurgu ? vurgu(d) : null;
        let mk = maske ? maske(d) : 0;
        let anahtar = `${dol}|${vg?.satir}|${vg?.sutun}|${vg?.hucre}|${Math.round(mk * 20)}`;
        if (anahtar === son.current.anahtar) return;
        son.current.anahtar = anahtar;
        for (let i = 0; i < satir; i++) for (let j = 0; j < sutun; j++) {
            let k = i * sutun + j, v = deger[i][j];
            let acik = !maskeli(i, j) && sira(i, j) < dol;
            let parlak = vg && (vg.satir === i || vg.sutun === j);
            let bas = vg?.hucre && vg.hucre[0] === i && vg.hucre[1] === j;
            let kalin = 0.12, zz = 0;
            if (maskeli(i, j)) c.copy(R.maske).multiplyScalar(mk > 0 ? 0.5 + 0.9 * mk : 0.35);
            else if (!acik) c.copy(R.sonuk).multiplyScalar(0.8);
            else renk(v, mx, tur, c);
            if (parlak && acik) { c.multiplyScalar(1.7).lerp(R.beyaz, 0.12); zz = 0.1; kalin = 0.22; }
            else if (parlak) { c.copy(R.sonuk).lerp(R.beyaz, 0.35); zz = 0.1; }
            if (bas) { c.copy(R.beyaz).multiplyScalar(2.2); zz = 0.2; kalin = 0.3; }
            if (odakSatir === i && acik && !parlak) { zz = Math.max(zz, 0.06); }
            m4.makeScale(H * 0.88, H * 0.88, kalin);
            m4.setPosition(x0 + (j + 0.5) * H, y0 - (i + 0.5) * H, z0 + zz);
            o.setMatrixAt(k, m4);
            o.setColorAt(k, c);
            let t = yazilar.current[k];
            if (t) {
                let s = maskeli(i, j) ? (mk > 0.5 ? '−∞' : '') : acik ? bc(v) : '';
                if (t.text !== s) { t.text = s; t.sync(); }
                t.position.z = z0 + zz + kalin / 2 + 0.01;
            }
        }
        o.instanceMatrix.needsUpdate = true;
        if (o.instanceColor) o.instanceColor.needsUpdate = true;
    });

    let ust = y0 + (sutunEtiket ? 1.0 : 0.1);
    return <group ref={grup}>
        <instancedMesh ref={ref} args={[KUTU, undefined, N]} frustumCulled={false}
            onPointerMove={e => {
                if (e.instanceId === undefined || !grup.current?.visible) return;
                e.stopPropagation();
                let i = Math.floor(e.instanceId / sutun), j = e.instanceId % sutun;
                let mtn = maskeli(i, j) ? L('maskeli (−∞): bu parça gelecekteki parçayı göremez', 'masked (−∞): this token cannot see a future token') : aciklama(i, j, deger[i][j]);
                ipucu.yaz({ metin: mtn, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
            }}
            onPointerOut={() => ipucu.yaz(null)}>
            <meshBasicMaterial ref={mat} toneMapped={false} transparent />
        </instancedMesh>
        {metin && deger.map((r, i) => r.map((_, j) => <Text key={`${i}-${j}`} ref={(t: any) => { yazilar.current[i * sutun + j] = t; }}
            font={FONT} fontSize={H * 0.27} color="#ffffff" position={[x0 + (j + 0.5) * H, y0 - (i + 0.5) * H, z0 + 0.1]}
            anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#05070f" outlineOpacity={0.7}> </Text>))}
        {satirEtiket?.map((e, i) => <Text key={'s' + i} font={FONT} fontSize={0.2} color={i === odakSatir ? '#ff8fa3' : '#c9d2f5'}
            position={[x0 - 0.12, y0 - (i + 0.5) * H, z0]} anchorX="right" anchorY="middle">{okunur(e).slice(0, 12)}</Text>)}
        {sutunEtiket?.map((e, j) => <Text key={'c' + j} font={FONT} fontSize={0.18} color={'#c9d2f5'} rotation={[0, 0, Math.PI / 4]}
            position={[x0 + (j + 0.5) * H, y0 + 0.12, z0]} anchorX="left" anchorY="middle">{okunur(e).slice(0, 10)}</Text>)}
        {baslik && <Text font={FONT} fontSize={0.3} color={R.yazi} position={[x0, ust + (alt ? 0.62 : 0.3), z0]} anchorX="left" anchorY="bottom"
            outlineWidth={0.015} outlineColor={R.zemin}>{baslik}</Text>}
        {alt && <Text font={FONT_INCE} fontSize={0.19} color={R.ikincil} position={[x0, ust + 0.3, z0]} anchorX="left" anchorY="bottom">{alt}</Text>}
    </group>;
};

const Yazi: React.FC<{ saat: Saat; konum: Konum; metin: string; boy?: number; renk?: string; gorunur: Gor; hiza?: 'left' | 'center' | 'right' }> =
    ({ saat, konum, metin, boy = 0.4, renk: rk = R.yazi, gorunur, hiza = 'center' }) => {
        let ref = useRef<any>(null);
        useFrame(() => { let o = ref.current; if (!o) return; let a = gorunur(saat.durum); o.visible = a > 0.01; o.fillOpacity = a; o.outlineOpacity = a * 0.8; });
        let [x, y, z = 0] = konum as number[];
        return <Text ref={ref} font={FONT} fontSize={boy} color={rk} position={[x, y, z]} anchorX={hiza} anchorY="middle" outlineWidth={boy * 0.05} outlineColor={R.zemin}>{metin}</Text>;
    };

// ---------- adımlar ----------

const adimda = (k: number, a = 0, b = 0.8): Gor => d => d.adim === k ? ara(d, k, a, b) : 0;
// adım k'nin a. saniyesinden sonra söner (kamera sonraki alt sahneye geçince öncekiler ekranı kalabalıklaştırmasın)
const soner = (g: Gor, k: number, a: number): Gor => d => g(d) * (d.adim === k ? 1 - ara(d, k, a, a + 0.6) : 1);
const tum = 1e9;

const AdimSahneleri: React.FC<{ saat: Saat; v: IAyrintiVeri; h: IHikayeVeri; D: IDuzen }> = ({ saat, v, h, D }) => {
    let T = v.n, son = T - 1;
    let tok = v.tokenler;
    let kn = (j: number) => `${L('kanal', 'channel')} ${v.kanal[j]}`;
    let tk = (i: number) => `"${okunur(tok[i])}"`;
    let bn = (j: number) => `${L('boyut', 'dim')} ${v.boyut[j]}`;
    let nr = (j: number) => `${L('nöron', 'neuron')} ${v.noron[j]}`;
    let devrik = (M: Mat) => M[0].map((_, j) => M.map(r => r[j]));
    let Kt = useMemo(() => devrik(v.K), [v]);
    let hepsi = (k: number) => adimda(k);
    // Çarpım taraması: A satırı, B sütunu, C hücresi
    let tar = (k: number, sat: number, sut: number, ucg = false) => ({
        A: (d: IDurum) => { let t = tarama(d, k, sat, sut, ucg); return t.aktif ? { satir: t.i } : null; },
        B: (d: IDurum) => { let t = tarama(d, k, sat, sut, ucg); return t.aktif ? { sutun: t.j } : null; },
        C: (d: IDurum) => { let t = tarama(d, k, sat, sut, ucg); return t.aktif ? { hucre: [t.i, t.j] as [number, number] } : null; },
        dol: (d: IDurum) => tarama(d, k, sat, sut, ucg).say,
    });
    let satirSatir = (k: number, a: number, b: number, sutun: number, ucg = false) => (d: IDurum) => {
        if (d.adim !== k) return d.adim > k ? tum : 0;
        let r = Math.floor(sinir((d.t - a) / (b - a)) * T);
        return ucg ? r * (r + 1) / 2 : r * sutun;
    };
    let yuz = (p: number) => L('%' + Math.round(p * 100), Math.round(p * 100) + '%');

    let q = tar(2, T, GA), pu = tar(3, T, T, true), av = tar(6, T, GA), iz = tar(7, T, GC), ml = tar(8, T, GF), ck = tar(10, 1, GV);
    let alt = D.alt;

    return <>
        {/* 0: girdi */}
        <Matris saat={saat} konum={[0, 0]} deger={v.X} tur="veri" baslik={L(`X · ${v.katman + 1}. bloğun girdisi`, `X · input of block ${v.katman + 1}`)} alt={L(`${T} parça × ${v.C} kanal (${GC} kanal gösteriliyor)`, `${T} tokens × ${v.C} channels (${GC} channels shown)`)}
            satirEtiket={tok} odakSatir={son} gorunur={hepsi(0)} dolum={satirSatir(0, 0.5, 2.5, GC)} aciklama={(i, j, x) => `X[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />

        {/* 1: katman normu */}
        <Matris saat={saat} konum={[0, 0]} deger={v.X} tur="veri" baslik="X" alt={`${T} × ${v.C}`} satirEtiket={tok} odakSatir={son}
            gorunur={hepsi(1)} aciklama={(i, j, x) => `X[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={[D.norm.mu, 0]} deger={v.mu.map(x => [x])} tur="veri" baslik="μ" metin bicim={x => say(x, 3)}
            gorunur={adimda(1, 1, 1.8)} aciklama={(i, _, x) => `${L('ortalama', 'mean')} μ (${tk(i)}) = ${say(x, 4)}`} />
        <Matris saat={saat} konum={[D.norm.sd, 0]} deger={v.sd.map(x => [x])} tur="olasilik" baslik="σ" metin bicim={x => say(x, 2)}
            gorunur={adimda(1, 1.6, 2.4)} aciklama={(i, _, x) => `standart sapma σ (${tk(i)}) = ${say(x, 4)}`} />
        <Yazi saat={saat} konum={[D.norm.Xn - 1.1, -T * H / 2]} metin="→" boy={0.7} gorunur={adimda(1, 3.2, 3.8)} />
        <Matris saat={saat} konum={[D.norm.Xn, 0]} deger={v.Xn} tur="veri" baslik="N₁ = (X − μ) / σ · γ + β" alt={L('her satır ayrı normlanır', 'each row normalized separately')}
            odakSatir={son} gorunur={adimda(1, 3.4, 4)} dolum={satirSatir(1, 3.6, 6.4, GC)} aciklama={(i, j, x) => `N₁[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />

        {/* 2: Q K V */}
        <Matris saat={saat} konum={D.qkv.A} deger={v.Xn} tur="veri" baslik="N₁" alt={`${T} × ${v.C}`} satirEtiket={tok} odakSatir={son}
            gorunur={hepsi(2)} vurgu={q.A} aciklama={(i, j, x) => `N₁[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        {([['W_Q', v.Wq, v.Q, 'Q'], ['W_K', v.Wk, v.K, 'K'], ['W_V', v.Wv, v.V, 'V']] as [string, Mat, Mat, string][]).map(([wa, W, C, ca], k) => <React.Fragment key={ca}>
            <Matris saat={saat} konum={[D.qkvX(k), D.qkv.Bm[1]]} deger={W} tur="agirlik" baslik={wa} alt={L(`${v.C} × ${v.A} · ${v.bas + 1}. baş`, `${v.C} × ${v.A} · head ${v.bas + 1}`)}
                gorunur={k === 0 ? adimda(2, 0.6, 1.4) : adimda(2, 7.5, 8.3)} vurgu={k === 0 ? q.B : undefined}
                aciklama={(i, j, x) => `${wa}[${kn(i)}, ${bn(j)}] = ${say(x, 4)} ${L('(öğrenilmiş ağırlık)', '(learned weight)')}`} />
            <Matris saat={saat} konum={[D.qkvX(k), 0]} deger={C} tur="veri" baslik={`${ca} = N₁ · ${wa}`} alt={`${T} × ${v.A}`} odakSatir={son}
                gorunur={k === 0 ? adimda(2, 1.2, 2) : adimda(2, 7.7, 8.5)} dolum={k === 0 ? q.dol : undefined} vurgu={k === 0 ? q.C : undefined}
                aciklama={(i, j, x) => `${ca}[${tk(i)}, ${bn(j)}] = ${say(x, 3)}  ${L(`(N₁ satırı · ${wa} sütunu, ${v.C} terim + sapma)`, `(row of N₁ · column of ${wa}, ${v.C} terms + bias)`)}`} />
        </React.Fragment>)}

        {/* 3: puanlar */}
        <Matris saat={saat} konum={D.puan.A} deger={v.Q} tur="veri" baslik="Q" alt={`${T} × ${v.A}`} satirEtiket={tok} odakSatir={son}
            gorunur={hepsi(3)} vurgu={pu.A} aciklama={(i, j, x) => `Q[${tk(i)}, ${bn(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.puan.Bm} deger={Kt} tur="veri" baslik="Kᵀ" alt={`${v.A} × ${T}`} sutunEtiket={tok}
            gorunur={adimda(3, 0.6, 1.4)} vurgu={pu.B} aciklama={(i, j, x) => `K[${tk(j)}, ${bn(i)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.puan.C} deger={v.S} tur="veri" baslik={`S = Q · Kᵀ / √${v.A}`} alt={L(`${T} × ${T} puan`, `${T} × ${T} scores`)} odakSatir={son} metin ucgen
            gorunur={adimda(3, 1.2, 2)} dolum={pu.dol} vurgu={pu.C} bicim={x => say(x, 1)}
            aciklama={(i, j, x) => `${tk(i)} → ${tk(j)} ${L('puanı', 'score')} = ${say(x, 3)}  (Q·K / √${v.A})`} />

        {/* 4: maske */}
        <Matris saat={saat} konum={[0, 0]} deger={v.S} tur="veri" baslik={L('S + maske', 'S + mask')} alt={L('köşegenin üstü = −∞', 'above the diagonal = −∞')} satirEtiket={tok} sutunEtiket={tok} odakSatir={son} metin ucgen
            gorunur={hepsi(4)} maske={d => d.adim === 4 ? ara(d, 4, 1.8, 3.4) : 0} bicim={x => say(x, 1)}
            aciklama={(i, j, x) => `${tk(i)} → ${tk(j)} ${L('puanı', 'score')} = ${say(x, 3)}`} />

        {/* 5: softmax */}
        <Matris saat={saat} konum={[0, 0]} deger={v.S} tur="veri" baslik={L('S (maskeli)', 'S (masked)')} satirEtiket={tok} sutunEtiket={tok} odakSatir={son} metin ucgen
            gorunur={hepsi(5)} maske={d => d.adim === 5 ? 1 : 0} bicim={x => say(x, 1)} aciklama={(i, j, x) => `${tk(i)} → ${tk(j)} ${L('puanı', 'score')} = ${say(x, 3)}`} />
        <Yazi saat={saat} konum={[T * H + 1.5, -T * H / 2]} metin="softmax →" boy={0.32} gorunur={adimda(5, 0.6, 1.2)} />
        <Matris saat={saat} konum={[D.sm.P, 0]} deger={v.P} tur="olasilik" baslik="A = softmax(S)" alt={L('her satırın toplamı %100', 'each row sums to 100%')} sutunEtiket={tok} odakSatir={son} metin ucgen
            gorunur={adimda(5, 0.8, 1.6)} maske={d => d.adim === 5 ? 1 : 0} dolum={satirSatir(5, 1, 3.8, T, true)} bicim={yuz}
            vurgu={d => d.adim === 5 && d.t > 4 ? { satir: son } : null}
            aciklama={(i, j, x) => L(`${tk(i)}, ${tk(j)} parçasına %${(x * 100).toFixed(1)} dikkat veriyor`, `${tk(i)} gives ${(x * 100).toFixed(1)}% attention to ${tk(j)}`)} />

        {/* 6: A · V */}
        <Matris saat={saat} konum={D.av.A} deger={v.P} tur="olasilik" baslik="A" alt={L(`${T} × ${T} dikkat`, `${T} × ${T} attention`)} satirEtiket={tok} odakSatir={son} metin ucgen
            gorunur={hepsi(6)} maske={d => d.adim === 6 ? 1 : 0} vurgu={av.A} bicim={yuz}
            aciklama={(i, j, x) => `${tk(i)} → ${tk(j)}: ${yuzde(x)}`} />
        <Matris saat={saat} konum={D.av.Bm} deger={v.V} tur="veri" baslik="V" alt={`${T} × ${v.A}`} satirEtiket={tok}
            gorunur={adimda(6, 0.6, 1.4)} vurgu={av.B} aciklama={(i, j, x) => `V[${tk(i)}, ${bn(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.av.C} deger={v.O} tur="veri" baslik="O = A · V" alt={L(`${T} × ${v.A} · ${v.bas + 1}. başın çıktısı`, `${T} × ${v.A} · output of head ${v.bas + 1}`)} odakSatir={son}
            gorunur={adimda(6, 1.2, 2)} dolum={av.dol} vurgu={av.C} aciklama={(i, j, x) => `O[${tk(i)}, ${bn(j)}] = ${say(x, 3)}  ${L('(dikkat payları · V sütunu)', '(attention shares · column of V)')}`} />

        {/* 7: başlar + izdüşüm + artık */}
        <Matris saat={saat} konum={D.izd.A} deger={v.birlesik} tur="veri" baslik={L(`[O₁ … O₁₂]  ${v.H} baş yan yana`, `[O₁ … O₁₂]  ${v.H} heads side by side`)} alt={`${T} × ${v.C}`} satirEtiket={tok} odakSatir={son}
            sutunEtiket={v.kanal.map(c => `${L('baş', 'head')} ${Math.floor(c / v.A) + 1}`)}
            gorunur={soner(hepsi(7), 7, 6.1)} vurgu={iz.A} aciklama={(i, j, x) => L(`${Math.floor(v.kanal[j] / v.A) + 1}. baş, ${tk(i)}: ${say(x, 3)}`, `head ${Math.floor(v.kanal[j] / v.A) + 1}, ${tk(i)}: ${say(x, 3)}`)} />
        <Matris saat={saat} konum={D.izd.Bm} deger={v.Wo} tur="agirlik" baslik="W_O" alt={`${v.C} × ${v.C}`}
            gorunur={soner(adimda(7, 0.6, 1.4), 7, 6.1)} vurgu={iz.B} aciklama={(i, j, x) => `W_O[${kn(i)}, ${kn(j)}] = ${say(x, 4)}`} />
        <Matris saat={saat} konum={D.izd.C} deger={v.proj} tur="veri" baslik={L('dikkat = [O₁ … O₁₂] · W_O', 'attention = [O₁ … O₁₂] · W_O')} alt={`${T} × ${v.C}`} odakSatir={son}
            gorunur={adimda(7, 1.2, 2)} dolum={iz.dol} vurgu={iz.C} aciklama={(i, j, x) => `dikkat[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        <Yazi saat={saat} konum={[D.izdAlt[0] - 2.7, D.izdAlt[1] - T * H / 2]} metin="+" boy={0.7} gorunur={adimda(7, 6.5, 7.2)} />
        <Matris saat={saat} konum={D.izdAlt} deger={v.X} tur="veri" baslik={L('X (bloğun girdisi)', 'X (block input)')} satirEtiket={tok} odakSatir={son}
            gorunur={adimda(7, 6.6, 7.4)} aciklama={(i, j, x) => `X[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        <Yazi saat={saat} konum={[D.izdAlt2[0] - 2.7, D.izdAlt2[1] - T * H / 2]} metin="=" boy={0.7} gorunur={adimda(7, 7.6, 8.2)} />
        <Matris saat={saat} konum={D.izdAlt2} deger={v.X1} tur="veri" baslik={L("X' = X + dikkat", "X' = X + attention")} satirEtiket={tok} odakSatir={son}
            gorunur={adimda(7, 7.8, 8.6)} dolum={satirSatir(7, 8, 10, GC)} aciklama={(i, j, x) => `X'[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />

        {/* 8: MLP */}
        <Matris saat={saat} konum={D.mlp.A} deger={v.Xn2} tur="veri" baslik="N₂ = norm(X')" alt={`${T} × ${v.C}`} satirEtiket={tok} odakSatir={son}
            gorunur={soner(hepsi(8), 8, 8.9)} vurgu={ml.A} aciklama={(i, j, x) => `N₂[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.mlp.Bm} deger={v.W1} tur="agirlik" baslik="W₁" alt={L(`${v.C} × ${(4 * v.C).toLocaleString(YEREL)} (${GF} nöron gösteriliyor)`, `${v.C} × ${(4 * v.C).toLocaleString(YEREL)} (${GF} neurons shown)`)}
            gorunur={soner(adimda(8, 0.6, 1.4), 8, 8.9)} vurgu={ml.B} aciklama={(i, j, x) => `W₁[${kn(i)}, ${nr(j)}] = ${say(x, 4)}`} />
        <Matris saat={saat} konum={D.mlp.C} deger={v.Hf} tur="veri" baslik="H = N₂ · W₁" alt={`${T} × ${(4 * v.C).toLocaleString(YEREL)}`} odakSatir={son}
            gorunur={soner(adimda(8, 1.2, 2), 8, 8.9)} dolum={ml.dol} vurgu={ml.C} aciklama={(i, j, x) => `H[${tk(i)}, ${nr(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.mlpG} deger={v.G} tur="veri" baslik="GELU(H)" alt={L("negatifler ≈ 0'a bastırılır", 'negatives pushed to ≈ 0')} odakSatir={son}
            gorunur={soner(adimda(8, 6.5, 7.3), 8, 8.9)} dolum={satirSatir(8, 6.8, 8.6, GF)} aciklama={(i, j, x) => `GELU(H)[${tk(i)}, ${nr(j)}] = ${say(x, 3)}  (${L('önce', 'before')} ${say(v.Hf[i][j], 3)})`} />
        <Matris saat={saat} konum={[D.mlpSag, -alt]} deger={v.mlp} tur="veri" baslik="MLP = GELU(H) · W₂" alt={`${T} × ${v.C}`} odakSatir={son} satirEtiket={tok}
            gorunur={adimda(8, 9.2, 10)} aciklama={(i, j, x) => `MLP[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
        <Yazi saat={saat} konum={[D.mlpSag - 3.2, -2 * alt - T * H / 2]} metin="X' +" boy={0.4} gorunur={adimda(8, 10, 10.6)} />
        <Matris saat={saat} konum={D.mlpX2} deger={v.X2} tur="veri" baslik={L("bloğun çıktısı = X' + MLP", "block output = X' + MLP")} alt={L(`${T} × ${v.C} · sonraki bloğun girdisi`, `${T} × ${v.C} · input of the next block`)} odakSatir={son} satirEtiket={tok}
            gorunur={adimda(8, 10, 10.8)} dolum={satirSatir(8, 10.2, 11.6, GC)} aciklama={(i, j, x) => `${L('çıktı', 'output')}[${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />

        {/* 9: 12 blok */}
        {v.bloklar.map((M, l) => {
            let [bx, by, bz] = D.blok(l);
            let mercek = h.mercek?.[l];
            return <React.Fragment key={l}>
                <Matris saat={saat} konum={[bx, by, bz]} deger={M} tur="veri" odakSatir={son} satirEtiket={l === 0 ? tok : undefined}
                    baslik={L(`${l + 1}. blok${l === v.katman ? ' (izlenen)' : ''}`, `block ${l + 1}${l === v.katman ? ' (shown)' : ''}`)}
                    gorunur={adimda(9, 0.2 + l * 0.3, 0.7 + l * 0.3)} vurgu={() => ({ satir: son })}
                    aciklama={(i, j, x) => `${L(`${l + 1}. bloğun çıktısı`, `output of block ${l + 1}`)} [${tk(i)}, ${kn(j)}] = ${say(x, 3)}`} />
                {mercek && <Yazi saat={saat} konum={[bx + GC * H + 0.3, by - son * H - H / 2, bz]} hiza="left" boy={0.26}
                    renk={l === v.L - 1 ? '#ff8fa3' : '#e8ecff'} metin={`→ ${okunur(mercek.metin)} ${yuzde(mercek.p, 0)}`}
                    gorunur={adimda(9, 4 + l * 0.25, 4.5 + l * 0.25)} />}
            </React.Fragment>;
        })}

        {/* 10: çıktı katmanı */}
        <Matris saat={saat} konum={D.cikti.A} deger={[v.hSon]} tur="veri" baslik={L(`h = son norm(${okunur(tok[son])})`, `h = final norm(${okunur(tok[son])})`)} alt={`1 × ${v.C}`} satirEtiket={[tok[son]]} odakSatir={0}
            gorunur={hepsi(10)} vurgu={ck.A} aciklama={(_, j, x) => `h[${kn(j)}] = ${say(x, 3)}`} />
        <Matris saat={saat} konum={D.cikti.Bm} deger={v.Wcikti} tur="agirlik" baslik={L('Eᵀ (gömme tablosu, devrik)', 'Eᵀ (embedding table, transposed)')} alt={L(`${v.C} × ${v.sozluk.toLocaleString(YEREL)} · ${GV} sütun`, `${v.C} × ${v.sozluk.toLocaleString(YEREL)} · ${GV} columns`)}
            sutunEtiket={v.enIyi.map(e => e.metin)} gorunur={adimda(10, 0.6, 1.4)} vurgu={ck.B}
            aciklama={(i, j, x) => L(`"${okunur(v.enIyi[j].metin)}" gömmesi, ${kn(i)} = ${say(x, 4)}`, `embedding of "${okunur(v.enIyi[j].metin)}", ${kn(i)} = ${say(x, 4)}`)} />
        <Matris saat={saat} konum={D.cikti.C} deger={[v.enIyi.map(e => e.logit)]} tur="veri" baslik={L('logitler = h · Eᵀ', 'logits = h · Eᵀ')} alt={L('her parça için bir puan', 'one score per token')} metin
            gorunur={adimda(10, 1.2, 2)} dolum={ck.dol} vurgu={ck.C} bicim={x => say(x, 1)}
            aciklama={(_, j, x) => `"${okunur(v.enIyi[j].metin)}" logiti = ${say(x, 3)}`} />

        {/* 11: sıcaklık */}
        <Cubuklar saat={saat} v={v} />
    </>;
};

const Cubuklar: React.FC<{ saat: Saat; v: IAyrintiVeri }> = ({ saat, v }) => {
    let grup = useRef<THREE.Group>(null);
    let cubuklar = useRef<(THREE.Mesh | null)[]>([]);
    let yazilar = useRef<any[]>([]);
    let sonT = useRef(-1);
    let p = useRef<number[]>([]);
    let gecici = useMemo(() => new THREE.Color(), []);
    let idler = useMemo(() => v.enIyi.map(e => e.id), [v]);
    let adim = 1.05;
    useFrame(() => {
        let d = saat.durum, g = grup.current; if (!g) return;
        let a = d.adim === 11 ? ara(d, 11, 0, 1) : 0;
        g.visible = a > 0.01;
        if (!g.visible) return;
        if (d.sicaklik !== sonT.current) { sonT.current = d.sicaklik; p.current = sicaklikliOlasilik(v.logitler, idler, d.sicaklik); }
        let mx = Math.max(...p.current, 1e-9);
        cubuklar.current.forEach((b, i) => {
            if (!b) return;
            let pi = p.current[i] ?? 0;
            let hgt = Math.max(0.03, 5.2 * Math.pow(pi, 0.7)) * yumusak(a * 1.3 - i * 0.03);
            b.scale.set(adim * 0.7, hgt, 0.6);
            b.position.set(i * adim, hgt / 2, 0);
            let mt = b.material as THREE.MeshBasicMaterial;
            gecici.copy(i === 0 ? R.odak : R.olasilik).multiplyScalar(0.5 + 1.4 * pi / mx);
            mt.color.copy(gecici);
            let t = yazilar.current[i];
            if (t) {
                let s = yuzde(pi, pi < 0.1 ? 1 : 0);
                if (t.text !== s) { t.text = s; t.sync(); }
                t.position.set(i * adim, hgt + 0.25, 0);
                t.fillOpacity = a;
            }
        });
    });
    return <group ref={grup}>
        {v.enIyi.map((e, i) => <mesh key={i} ref={r => { cubuklar.current[i] = r; }} geometry={KUTU}><meshBasicMaterial toneMapped={false} /></mesh>)}
        {v.enIyi.map((e, i) => <Text key={'p' + i} ref={(r: any) => { yazilar.current[i] = r; }} font={FONT} fontSize={0.24} color="#ffe2a8" anchorX="center" anchorY="bottom"> </Text>)}
        {v.enIyi.map((e, i) => <Text key={'t' + i} font={FONT} fontSize={0.26} color={i === 0 ? '#ff8fa3' : '#d6ddff'} rotation={[0, 0, Math.PI / 3]}
            position={[i * adim + 0.1, -0.2, 0]} anchorX="right" anchorY="top">{okunur(e.metin).slice(0, 12)}</Text>)}
    </group>;
};

// ---------- kamera ----------

const KameraYonetici: React.FC<{ saat: Saat; D: IDuzen; kontrol: React.MutableRefObject<CameraControls | null>; bosluk: { sag: number; alt: number; ust?: number; sol?: number } }> = ({ saat, D, kontrol, bosluk }) => {
    let { size, camera } = useThree();
    React.useEffect(() => {
        let c = camera as THREE.PerspectiveCamera;
        let genis = size.width > 760;
        // üstte adım çubuğu + seçici, altta altyazı + oynatıcı, sağda panel: görüntü boş alanın ortasına
        c.setViewOffset(size.width, size.height, genis ? (bosluk.sag - (bosluk.sol ?? 0)) / 2 : 0, (bosluk.alt - (bosluk.ust ?? 0)) / 2, size.width, size.height);
        c.updateProjectionMatrix();
    }, [camera, size.width, size.height, bosluk.sag, bosluk.alt, bosluk.ust, bosluk.sol]);
    let onceki = useRef('');
    useFrame((_, dt) => {
        saat.ilerlet(Math.min(dt, 0.1));
        let d = saat.durum;
        let kareler = AYRINTI_ADIMLARI[d.adim].kamera(D);
        let ki = 0;
        kareler.forEach((k, i) => { if (k.t <= d.t + 1e-6) ki = i; });
        let anahtar = `${d.adim}|${ki}|${d.kameraSayac}|${D.T}|${Math.round(size.width / 50)}|${Math.round(size.height / 50)}|${bosluk.sol}|${bosluk.sag}`;
        if (anahtar === onceki.current || !kontrol.current) return;
        let ilk = onceki.current === '';
        onceki.current = anahtar;
        let { kutu, z = 0, yon = [0.13, 0.07, 1] } = kareler[ki];
        let [x0, y0, x1, y1] = kutu;
        let genis = size.width > 760;
        let kullanW = Math.max(200, size.width - (genis ? bosluk.sag + (bosluk.sol ?? 0) : 0)), kullanH = Math.max(200, size.height - bosluk.alt - (bosluk.ust ?? 0));
        let en = kullanW / kullanH, tan = Math.tan(20 * Math.PI / 180);
        let w = x1 - x0 + 1, hh = y1 - y0 + 1.6;
        let uz = Math.max(hh / (2 * tan), w / (2 * tan * en)) * 1.06 * (size.height / kullanH);
        let n = Math.hypot(...yon);
        let hedef = [(x0 + x1) / 2, (y0 + y1) / 2, z];
        let poz = [hedef[0] + yon[0] / n * uz, hedef[1] + yon[1] / n * uz, hedef[2] + yon[2] / n * uz];
        kontrol.current.setLookAt(poz[0], poz[1], poz[2], hedef[0], hedef[1], hedef[2], !ilk);
    });
    return null;
};

export const AyrintiSahne: React.FC<{ saat: Saat; v: IAyrintiVeri; h: IHikayeVeri; kontrol: React.MutableRefObject<CameraControls | null>; bosluk: { sag: number; alt: number; ust?: number; sol?: number } }> = ({ saat, v, h, kontrol, bosluk }) => {
    let D = useMemo(() => duzen(v.n, v.L), [v.n, v.L]);
    return <Canvas dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 500, position: [5, 2, 30] }} gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => ipucu.yaz(null)}>
        <color attach="background" args={[R.zemin]} />
        <fog attach="fog" args={[R.zemin, 60, 160]} />
        <ambientLight intensity={0.6} />
        <Sparkles count={60} scale={[70, 50, 30]} position={[8, -6, -14]} size={2} speed={0.2} opacity={0.3} color="#8fa8ff" />
        <AdimSahneleri saat={saat} v={v} h={h} D={D} />
        <CameraControls ref={kontrol} smoothTime={0.8} minDistance={1.5} maxDistance={200} />
        <KameraYonetici saat={saat} D={D} kontrol={kontrol} bosluk={bosluk} />
        <EffectComposer>
            <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.6} />
            <Vignette eskil={false} offset={0.25} darkness={0.5} />
        </EffectComposer>
    </Canvas>;
};

