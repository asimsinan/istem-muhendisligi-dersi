'use client';
// TR: Sinematik 3B sahne (React Three Fiber + drei + postprocessing). Koyu zemin, parlayan nesneler.
// Bütün animasyonlar saatin (akis.ts: Saat) adım/saniyesinden hesaplanır; bileşenler useFrame içinde
// three.js nesnelerini doğrudan günceller (React her karede yeniden çizmez).
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Edges, QuadraticBezierLine, RoundedBox, Sparkles, Text } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ADIMLAR, IDurum, IYerlesim, Saat, ara, sinir, yumusak, yerlesim } from './akis';
import { IHikayeVeri, K, NORON, okunur, say, yuzde, kucukSay } from './veri';
import { yol } from '@/src/llm/tr/yol';
import { L as dl, YEREL } from '../llm/tr/dil';

const FONT = yol('/fonts/hikaye/Inter-600.ttf');
const FONT_INCE = yol('/fonts/hikaye/Inter-400.ttf');

// Renkler (koyu zemin üzerinde; toneMapped=false ile 1'in üstündeki değerler ışıldar)
const R = {
    zemin: '#070b17',
    kart: '#151d38',
    kartKenar: new THREE.Color('#5d7cff'),
    odak: new THREE.Color('#ff3b5c'),
    veriArti: new THREE.Color('#33e0b0'),
    veriEksi: new THREE.Color('#ff5c8a'),
    agArti: new THREE.Color('#6c8cff'),
    agEksi: new THREE.Color('#ffb347'),
    yay: new THREE.Color('#ffb547'),
    noron: new THREE.Color('#d8ff5a'),
    sonuk: new THREE.Color('#1c2444'),
    yazi: '#e8ecff',
    ikincil: '#8f9bc7',
};

type Tur = 'veri' | 'agirlik';

function hucreRengi(v: number, mx: number, tur: Tur, out: THREE.Color) {
    let a = sinir(Math.abs(v) / Math.max(mx, 1e-9));
    let renk = tur === 'veri' ? (v >= 0 ? R.veriArti : R.veriEksi) : (v >= 0 ? R.agArti : R.agEksi);
    let parlak = 0.12 + 1.25 * Math.pow(a, 0.8);
    out.copy(renk).multiplyScalar(parlak);
    return out;
}

const enBuyuk = (v: ArrayLike<number>) => { let m = 0; for (let i = 0; i < v.length; i++) m = Math.max(m, Math.abs(v[i])); return m; };
const karistir = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t);

// ---------- yazı ----------

const Yazi: React.FC<{
    saat: Saat; konum: [number, number, number]; metin: string; boy?: number; renk?: string;
    gorunur: (d: IDurum) => number; hiza?: 'left' | 'center' | 'right'; ince?: boolean; dikey?: 'top' | 'middle' | 'bottom';
    donus?: [number, number, number];
}> = ({ saat, konum, metin, boy = 0.3, renk = R.yazi, gorunur, hiza = 'center', ince, dikey = 'middle', donus }) => {
    let ref = useRef<any>(null);
    useFrame(() => {
        let o = ref.current; if (!o) return;
        let a = gorunur(saat.durum);
        o.visible = a > 0.01;
        o.fillOpacity = a;
        if (o.material) { o.material.transparent = true; o.material.opacity = a; }
    });
    return <Text ref={ref} position={konum} rotation={donus} font={ince ? FONT_INCE : FONT} fontSize={boy} color={renk}
        anchorX={hiza} anchorY={dikey} outlineWidth={boy * 0.06} outlineColor={R.zemin} outlineOpacity={0.8}>{metin}</Text>;
};

// ---------- parça kartı ----------

const Kart: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim; j: number }> = ({ saat, veri, y, j }) => {
    let grup = useRef<THREE.Group>(null);
    let kenar = useRef<THREE.MeshBasicMaterial>(null);
    let gov = useRef<THREE.MeshStandardMaterial>(null);
    let odak = j === veri.odak;
    let gen = Math.min(2.7, y.aralik * 0.86);
    let metin = okunur(veri.tokenler[j]);
    let boy = Math.min(0.46, gen * 1.55 / Math.max(3, metin.length));
    let gecici = new THREE.Color();
    useFrame(({ clock }) => {
        let d = saat.durum;
        let a = d.adim === 0 ? yumusak((d.t - 0.25 - j * 0.32) / 0.5) : 1;
        if (grup.current) {
            grup.current.visible = a > 0.01;
            grup.current.position.set(y.x(j), y.kartY + (1 - a) * 1.2, 0);
            grup.current.scale.setScalar(0.7 + 0.3 * a);
        }
        // odak parça 4. adımdan (normalizasyon) itibaren kırmızı ışır
        let vurgu = odak ? ara(d, 3, 0, 1.2) : 0;
        let nabiz = odak && d.adim >= 3 ? 0.15 * Math.sin(clock.elapsedTime * 3) : 0;
        if (kenar.current) {
            gecici.copy(R.kartKenar).lerp(R.odak, vurgu).multiplyScalar(1.1 + vurgu * 0.9 + nabiz);
            kenar.current.color.copy(gecici);
            kenar.current.opacity = a * (0.55 + 0.45 * vurgu);
        }
        if (gov.current) gov.current.opacity = a;
    });
    return <group ref={grup}>
        <RoundedBox args={[gen + 0.08, 1.03, 0.16]} radius={0.12} smoothness={4} position={[0, 0, -0.03]}>
            <meshBasicMaterial ref={kenar} toneMapped={false} transparent />
        </RoundedBox>
        <RoundedBox args={[gen, 0.95, 0.2]} radius={0.1} smoothness={4}>
            <meshStandardMaterial ref={gov} color={R.kart} roughness={0.45} metalness={0.25} transparent />
        </RoundedBox>
        <Yazi saat={saat} konum={[0, 0.02, 0.12]} metin={metin} boy={boy} gorunur={() => 1} />
        <Yazi saat={saat} konum={[0, -0.82, 0.05]} metin={`#${veri.ids[j]}`} boy={0.26} renk="#9fb2ff" ince
            gorunur={d => ara(d, 1, 2.6 + j * 0.18, 3.2 + j * 0.18)} />
    </group>;
};

// ---------- vektör şeridi ----------

const KUTU = new THREE.BoxGeometry(1, 1, 1);

const Serit: React.FC<{
    saat: Saat; y: IYerlesim; x: number; tur: Tur;
    degerler: (d: IDurum) => number[];
    gorunur: (d: IDurum) => number;
    kayma?: (d: IDurum) => [number, number];
    genislik?: number;
}> = ({ saat, y, x, tur, degerler, gorunur, kayma, genislik = 0.62 }) => {
    let ref = useRef<THREE.InstancedMesh>(null);
    let mat = useRef<THREE.MeshBasicMaterial>(null);
    let son = useRef<string>('');
    let renk = useMemo(() => new THREE.Color(), []);
    let m = useMemo(() => new THREE.Matrix4(), []);
    useFrame(() => {
        let d = saat.durum, o = ref.current; if (!o) return;
        let a = gorunur(d);
        o.visible = a > 0.01;
        if (!o.visible) return;
        let [dx, dy] = kayma ? kayma(d) : [0, 0];
        o.position.set(x + dx, dy, 0);
        if (mat.current) mat.current.opacity = Math.min(1, a * 1.05);
        let v = degerler(d);
        let anahtar = v.map(z => z.toFixed(4)).join(',');
        if (anahtar !== son.current) {
            son.current = anahtar;
            let mx = enBuyuk(v);
            for (let i = 0; i < K; i++) {
                m.makeScale(genislik, y.hucre * 0.84, 0.16);
                m.setPosition(0, y.seritUst - (i + 0.5) * y.hucre, 0);
                o.setMatrixAt(i, m);
                o.setColorAt(i, hucreRengi(v[i] ?? 0, mx, tur, renk));
            }
            o.instanceMatrix.needsUpdate = true;
            if (o.instanceColor) o.instanceColor.needsUpdate = true;
        }
    });
    return <instancedMesh ref={ref} args={[KUTU, undefined, K]} frustumCulled={false}>
        <meshBasicMaterial ref={mat} toneMapped={false} transparent />
    </instancedMesh>;
};

// Odak şeridinin sayıları (ilk 6 hücre)
const SeritSayilari: React.FC<{
    saat: Saat; y: IYerlesim; x: number; degerler: (d: IDurum) => number[]; gorunur: (d: IDurum) => number;
    sol?: boolean; basamak?: number; adet?: number; renk?: string;
}> = ({ saat, y, x, degerler, gorunur, sol, basamak = 3, adet = 6, renk = R.yazi }) => {
    let refs = useRef<any[]>([]);
    useFrame(() => {
        let d = saat.durum, a = gorunur(d), v = degerler(d);
        refs.current.forEach((o, i) => {
            if (!o) return;
            o.visible = a > 0.01;
            o.fillOpacity = a;
            let s = say(v[i] ?? 0, basamak);
            if (o.text !== s) { o.text = s; o.sync(); }
        });
    });
    return <group>
        {Array.from({ length: adet }, (_, i) => <Text key={i} ref={(r: any) => { refs.current[i] = r; }} font={FONT_INCE}
            position={[x + (sol ? -0.42 : 0.42), y.seritUst - (i + 0.5) * y.hucre, 0.1]} fontSize={0.17} color={renk}
            anchorX={sol ? 'right' : 'left'} anchorY="middle" outlineWidth={0.012} outlineColor={R.zemin}>0</Text>)}
    </group>;
};

// ---------- gömme ----------

const Gomme: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim }> = ({ saat, veri, y }) => {
    let son = veri.odak;
    return <group>
        {veri.tokenler.map((_, j) => {
            let x = y.x(j);
            let gecikme = j * 0.12;
            // 3. adım: token şeridi düşer (0,4–2), konum şeridi sağdan gelir (3–4,2), birleşip toplam olur (5,6–7)
            let tokGor = (d: IDurum) => d.adim < 2 ? 0 : d.adim > 2 ? 0 : ara(d, 2, 0.4 + gecikme, 1.6 + gecikme) * (1 - ara(d, 2, 5.6, 6.6));
            let pozGor = (d: IDurum) => d.adim !== 2 ? 0 : ara(d, 2, 3 + gecikme, 4.1 + gecikme) * (1 - ara(d, 2, 5.6, 6.6));
            let toplamGor = (d: IDurum) => {
                if (d.adim < 2) return 0;
                let a = ara(d, 2, 5.8, 7);
                // sonraki adımlarda odak dışı sütunlar biraz söner
                let sonuk = j === son ? 1 : 1 - 0.55 * ara(d, 3, 0, 1);
                if (d.adim >= 7) sonuk *= 1 - 0.7 * ara(d, 7, 0, 1);
                return a * sonuk;
            };
            let tokKay = (d: IDurum): [number, number] => [-0.36 * ara(d, 2, 3, 4), (1 - ara(d, 2, 0.4 + gecikme, 1.6 + gecikme)) * 1.4];
            let pozKay = (d: IDurum): [number, number] => [0.36 + (1 - ara(d, 2, 3 + gecikme, 4.1 + gecikme)) * 1.8, 0];
            // odak sütununun değerleri adımlarla değişir: x0 → norm → +dikkat → +MLP
            let toplam = (d: IDurum) => {
                if (j !== son) return veri.x0[j];
                if (d.adim < 3) return veri.x0[j];
                if (d.adim === 3) return karistir(veri.x0[j], veri.ln.v, ara(d, 3, 4, 5.5));
                if (d.adim === 4) return veri.ln.v;
                if (d.adim === 5) return karistir(veri.ln.v, veri.res1, ara(d, 5, 3.2, 4.6));
                if (d.adim === 6) return karistir(veri.res1, veri.res2, ara(d, 6, 5.4, 6.8));
                return veri.res2;
            };
            return <group key={j}>
                <Serit saat={saat} y={y} x={x} tur="agirlik" degerler={() => veri.tok[j]} gorunur={tokGor} kayma={tokKay} genislik={0.5} />
                <Serit saat={saat} y={y} x={x} tur="agirlik" degerler={() => veri.poz[j]} gorunur={pozGor} kayma={pozKay} genislik={0.5} />
                <Serit saat={saat} y={y} x={x} tur="veri" degerler={toplam} gorunur={toplamGor} />
            </group>;
        })}
        {/* odak parçanın sayıları */}
        <SeritSayilari saat={saat} y={y} x={y.x(son) - 0.36} sol degerler={() => veri.tok[son]} renk="#b9c6ff"
            gorunur={d => d.adim === 2 ? ara(d, 2, 1.8, 2.6) * (1 - ara(d, 2, 5.6, 6.2)) : 0} />
        <SeritSayilari saat={saat} y={y} x={y.x(son) + 0.36} degerler={() => veri.poz[son]} renk="#ffd59a"
            gorunur={d => d.adim === 2 ? ara(d, 2, 4.2, 4.8) * (1 - ara(d, 2, 5.6, 6.2)) : 0} />
        <SeritSayilari saat={saat} y={y} x={y.x(son)} degerler={d => {
            if (d.adim <= 2) return veri.x0[son];
            if (d.adim === 3) return d.t < 4.6 ? veri.x0[son] : veri.ln.v;
            if (d.adim === 4) return veri.ln.v;
            if (d.adim === 5) return d.t < 3.9 ? veri.ln.v : veri.res1;
            return d.t < 6.1 || d.adim > 6 ? (d.adim > 6 ? veri.res2 : veri.res1) : veri.res2;
        }} gorunur={d => d.adim === 2 ? ara(d, 2, 6.6, 7.4) : (d.adim >= 3 && d.adim <= 6 ? 1 : 0)} />
        <Yazi saat={saat} konum={[y.x(son), y.seritUst - K * y.hucre - 0.45, 0]} metin="+" boy={0.5} renk="#ffffff"
            gorunur={d => d.adim === 2 ? ara(d, 2, 4.4, 4.8) * (1 - ara(d, 2, 5.6, 6)) : 0} />
        <Yazi saat={saat} konum={[y.x(son), y.seritUst - K * y.hucre - 0.45, 0]} metin={dl(`${K} / ${veri.C} sayı`, `${K} / ${veri.C} numbers`)} boy={0.22} renk={R.ikincil} ince
            gorunur={d => d.adim === 2 ? ara(d, 2, 7, 7.6) : 0} />
        {/* normalizasyon özeti */}
        <Yazi saat={saat} konum={[y.x(son) - 0.5, y.seritUst - 0.3, 0]} metin={`μ = ${kucukSay(veri.ln.mu)}\nσ = ${kucukSay(veri.ln.sd)}`} boy={0.26}
            hiza="right" renk="#ffd166" gorunur={d => d.adim === 3 ? ara(d, 3, 2, 2.8) : 0} />
        <Yazi saat={saat} konum={[y.x(son) - 0.5, y.seritUst - 1.3, 0]} metin="(x − μ) / σ · γ + β" boy={0.2} hiza="right" renk={R.ikincil}
            gorunur={d => d.adim === 3 ? ara(d, 3, 3.2, 4) : 0} />
    </group>;
};

// ---------- dikkat ----------

const Dikkat: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim }> = ({ saat, veri, y }) => {
    let son = veri.odak;
    let ust = y.kartY + 0.55;
    let refs = useRef<any[]>([]);
    let yaziRefs = useRef<any[]>([]);
    let agirlik = useRef<number[]>(veri.dikkat[0][0].slice());
    let qRef = useRef<THREE.Mesh>(null);
    let kRefs = useRef<(THREE.Mesh | null)[]>([]);
    useFrame(({ clock }, dt) => {
        let d = saat.durum;
        let hedef = veri.dikkat[d.dikkat.katman][d.dikkat.bas];
        // baş değişince kalınlıklar yumuşakça yeni değerlere geçer
        agirlik.current = agirlik.current.map((w, j) => w + ((hedef[j] ?? 0) - w) * Math.min(1, dt * 6));
        let gor = d.adim === 4 ? ara(d, 4, 2.6, 3.6) : d.adim === 5 ? 1 - 0.6 * ara(d, 5, 4, 5) : 0;
        let soru = d.adim === 4 ? ara(d, 4, 0.6, 1.4) : d.adim === 5 ? 1 - ara(d, 5, 4, 5) : 0;
        if (qRef.current) {
            qRef.current.visible = soru > 0.01;
            qRef.current.position.set(y.x(son), ust + 0.25 + soru * 0.35 + 0.05 * Math.sin(clock.elapsedTime * 4), 0);
            qRef.current.scale.setScalar(0.16 + 0.04 * Math.sin(clock.elapsedTime * 4));
        }
        kRefs.current.forEach((k, j) => {
            if (!k) return;
            let a = d.adim === 4 ? ara(d, 4, 1.2 + j * 0.08, 2 + j * 0.08) : soru;
            k.visible = a > 0.01;
            k.position.set(y.x(j), ust + 0.25, 0);
            k.scale.setScalar(0.09 + 0.05 * a);
        });
        refs.current.forEach((l, j) => {
            if (!l) return;
            let w = agirlik.current[j] ?? 0;
            l.visible = gor > 0.01 && w > 0.004;
            if (l.material) {
                l.material.opacity = gor * (0.25 + 0.75 * Math.sqrt(w));
                l.material.linewidth = 1.5 + 22 * w;
                l.material.dashOffset = -clock.elapsedTime * 0.8;
            }
        });
        yaziRefs.current.forEach((o, j) => {
            if (!o) return;
            let w = agirlik.current[j] ?? 0;
            let a = (d.adim === 4 ? ara(d, 4, 3.4, 4.2) : d.adim === 5 ? 1 - ara(d, 5, 4, 5) : 0) * sinir((w - 0.02) / 0.03);
            o.visible = a > 0.01;
            o.fillOpacity = a;
            let s = yuzde(hedef[j] ?? 0, 0);
            if (o.text !== s) { o.text = s; o.sync(); }
            o.fontSize = 0.2 + 0.32 * Math.sqrt(w);
        });
    });
    return <group>
        <mesh ref={qRef}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color={R.odak.clone().multiplyScalar(2.2)} toneMapped={false} /></mesh>
        {veri.tokenler.slice(0, son).map((_, j) => <mesh key={'k' + j} ref={r => { kRefs.current[j] = r; }}>
            <sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color={R.yay.clone().multiplyScalar(1.6)} toneMapped={false} />
        </mesh>)}
        {veri.tokenler.map((_, j) => {
            if (j === son) return null;
            let x0 = y.x(son), x1 = y.x(j);
            let yuk = 0.9 + Math.abs(x1 - x0) * 0.28;
            return <group key={j}>
                <QuadraticBezierLine ref={(r: any) => { refs.current[j] = r; }} start={[x0, ust + 0.25, 0]} end={[x1, ust + 0.25, 0]}
                    mid={[(x0 + x1) / 2, ust + 0.25 + yuk, 0]} color={R.yay.clone().multiplyScalar(1.5)} lineWidth={2}
                    transparent dashed dashSize={0.35} gapSize={0.12} toneMapped={false} />
                <Text ref={(r: any) => { yaziRefs.current[j] = r; }} position={[(x0 + x1) / 2, ust + 0.25 + yuk * 0.5 + 0.28, 0]}
                    font={FONT} fontSize={0.3} color="#ffe2a8" anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor={R.zemin}>%0</Text>
            </group>;
        })}
        <Yazi saat={saat} konum={[y.x(son) + 0.3, ust + 1.0, 0]} metin="Q" boy={0.3} renk="#ff8fa3" hiza="left" gorunur={d => d.adim === 4 ? ara(d, 4, 0.8, 1.4) * (1 - ara(d, 4, 3, 3.6)) : 0} />
        <Yazi saat={saat} konum={[y.x(0), ust + 0.75, 0]} metin="K" boy={0.26} renk="#ffd38a" gorunur={d => d.adim === 4 ? ara(d, 4, 1.4, 2) * (1 - ara(d, 4, 3, 3.6)) : 0} />
        <Akis saat={saat} veri={veri} y={y} agirlik={agirlik} />
    </group>;
};

// 6. adım: değer vektörleri yaylar boyunca odak parçaya akar
const Akis: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim; agirlik: React.MutableRefObject<number[]> }> = ({ saat, veri, y, agirlik }) => {
    let son = veri.odak, ust = y.kartY + 0.8;
    let N = 260;
    let ref = useRef<THREE.InstancedMesh>(null);
    let m = useMemo(() => new THREE.Matrix4(), []);
    let renk = useMemo(() => new THREE.Color(), []);
    let p = useMemo(() => new THREE.Vector3(), []);
    let tonlar = useMemo(() => veri.tokenler.map((_, j) => new THREE.Color().setHSL((j * 0.13 + 0.05) % 1, 0.85, 0.62).multiplyScalar(1.8)), [veri]);
    useFrame(({ clock }) => {
        let d = saat.durum, o = ref.current; if (!o) return;
        let gor = d.adim === 5 ? ara(d, 5, 0.3, 1) * (1 - ara(d, 5, 4.4, 5.2)) : 0;
        o.visible = gor > 0.01;
        if (!o.visible) return;
        let w = agirlik.current, toplam = 0;
        for (let j = 0; j < son; j++) toplam += w[j] ?? 0;
        let i = 0;
        for (let j = 0; j < son && i < N; j++) {
            let adet = Math.round(((w[j] ?? 0) / Math.max(toplam, 1e-6)) * (N - 2 * son)) + 2;
            let x1 = y.x(j), x0 = y.x(son), yuk = 0.9 + Math.abs(x1 - x0) * 0.28;
            for (let k = 0; k < adet && i < N; k++, i++) {
                let u = (clock.elapsedTime * 0.45 + k / adet + j * 0.07) % 1;
                // kaynak (j) → hedef (son) eğrisi
                let a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
                p.set(a * x1 + b * (x0 + x1) / 2 + c * x0, ust + b * yuk, (k % 3 - 1) * 0.06);
                let s = 0.05 + 0.05 * Math.sqrt(w[j] ?? 0) * 2;
                m.makeScale(s, s, s); m.setPosition(p);
                o.setMatrixAt(i, m);
                o.setColorAt(i, renk.copy(tonlar[j]).multiplyScalar(gor));
            }
        }
        for (; i < N; i++) { m.makeScale(0, 0, 0); o.setMatrixAt(i, m); }
        o.instanceMatrix.needsUpdate = true;
        if (o.instanceColor) o.instanceColor.needsUpdate = true;
    });
    return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
    </instancedMesh>;
};

// ---------- MLP ----------

const Mlp: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim }> = ({ saat, veri, y }) => {
    let son = veri.odak;
    let SUT = 12, SAT = NORON / SUT;
    let ref = useRef<THREE.InstancedMesh>(null);
    let m = useMemo(() => new THREE.Matrix4(), []);
    let renk = useMemo(() => new THREE.Color(), []);
    let mx = useMemo(() => Math.max(...veri.gelu, 1e-6), [veri]);
    let x0 = y.noronX, ust = y.seritUst - 0.4, ad = 0.42;
    useFrame(({ clock }) => {
        let d = saat.durum, o = ref.current; if (!o) return;
        let ac = d.adim === 6 ? ara(d, 6, 0.3, 1.8) * (1 - ara(d, 6, 5.2, 6.4)) : 0;
        let yan = d.adim === 6 ? ara(d, 6, 2.4, 4) : 0;
        o.visible = ac > 0.01;
        if (!o.visible) return;
        for (let i = 0; i < NORON; i++) {
            let c = i % SUT, r = Math.floor(i / SUT);
            let hx = x0 + c * ad, hy = ust - r * ad;
            // şeritten çıkıp ızgaraya yayılır
            let sx = y.x(son) + (hx - y.x(son)) * ac, sy = y.seritUst - 2 + (hy - y.seritUst + 2) * ac;
            let g = veri.gelu[i];
            let a = sinir(g / mx);
            let s = (0.07 + 0.09 * (g > 0 ? Math.sqrt(a) : 0) * yan) * (0.4 + 0.6 * ac);
            m.makeScale(s, s, s); m.setPosition(sx, sy, 0);
            o.setMatrixAt(i, m);
            if (g > 0) renk.copy(R.sonuk).lerp(R.noron, yan * Math.sqrt(a)).multiplyScalar(1 + yan * a * 1.8 + 0.1 * Math.sin(clock.elapsedTime * 5 + i));
            else renk.copy(R.sonuk).multiplyScalar(1.4);
            o.setColorAt(i, renk);
        }
        o.instanceMatrix.needsUpdate = true;
        if (o.instanceColor) o.instanceColor.needsUpdate = true;
    });
    return <group>
        <instancedMesh ref={ref} args={[undefined, undefined, NORON]} frustumCulled={false}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
        <Yazi saat={saat} konum={[x0 + (SUT - 1) * ad / 2, ust + 0.55, 0]} metin={dl(`${(4 * veri.C).toLocaleString(YEREL)} nörondan ${NORON}'ı`, `${NORON} of ${(4 * veri.C).toLocaleString(YEREL)} neurons`)} boy={0.24} renk={R.ikincil} ince
            gorunur={d => d.adim === 6 ? ara(d, 6, 1.2, 1.8) * (1 - ara(d, 6, 5.2, 6)) : 0} />
        <Yazi saat={saat} konum={[x0 + (SUT - 1) * ad / 2, ust - SAT * ad - 0.1, 0]} metin={`${dl('etkin', 'active')}: ${yuzde(veri.etkinOran, 0)}`} boy={0.3} renk="#e6ff8a"
            gorunur={d => d.adim === 6 ? ara(d, 6, 3, 3.8) * (1 - ara(d, 6, 5.2, 6)) : 0} />
        <Yazi saat={saat} konum={[x0 - 0.2, ust + 0.55, 0]} metin="GELU" boy={0.22} hiza="left" renk="#e6ff8a"
            gorunur={d => d.adim === 6 ? ara(d, 6, 2.4, 3) * (1 - ara(d, 6, 5.2, 6)) : 0} />
    </group>;
};

// ---------- 12 blok kulesi ----------

const Kule: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim }> = ({ saat, veri, y }) => {
    let gen = Math.max(5.5, Math.min(9, y.genislik * 0.5));
    let kure = useRef<THREE.Mesh>(null);
    let katlar = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
    let L = veri.L;
    let yer = (k: number) => y.kuleUst - k * y.kuleAdim;
    useFrame(({ clock }) => {
        let d = saat.durum;
        let gor = d.adim >= 7 ? ara(d, 7, 0, 1.2) : 0;
        let ilerle = d.adim === 7 ? sinir((d.t - 1.2) / 6.6) : d.adim > 7 ? 1 : 0;
        if (kure.current) {
            kure.current.visible = d.adim === 7 && gor > 0.01;
            kure.current.position.set(0, yer(0) + 0.9 - ilerle * (L * y.kuleAdim + 0.2), 0.9);
            kure.current.scale.setScalar(0.22 + 0.04 * Math.sin(clock.elapsedTime * 6));
        }
        katlar.current.forEach((mt, k) => {
            if (!mt) return;
            let gecti = ilerle * L > k ? 1 : 0;
            mt.opacity = gor * (0.35 + 0.35 * gecti);
            mt.emissiveIntensity = 0.15 + 0.9 * gecti * (1 - Math.min(1, (ilerle * L - k) * 0.6)) + 0.12 * gecti;
        });
    });
    let mercek = veri.mercek;
    let grup = useRef<THREE.Group>(null);
    useFrame(() => { if (grup.current) grup.current.visible = saat.durum.adim === 7; });
    return <group ref={grup}>
        {Array.from({ length: L }, (_, k) => <group key={k} position={[0, yer(k), 0]}>
            <RoundedBox args={[gen, 0.55, 1.8]} radius={0.12} smoothness={3}>
                <meshStandardMaterial ref={r => { katlar.current[k] = r; }} color="#1a2452" emissive="#3a63ff" emissiveIntensity={0.2}
                    transparent opacity={0.4} roughness={0.4} metalness={0.2} />
                <Edges color="#5d7cff" threshold={15} />
            </RoundedBox>
            <Yazi saat={saat} konum={[-gen / 2 - 0.25, 0, 0.95]} metin={dl(`${k + 1}. blok`, `block ${k + 1}`)} boy={0.28} hiza="right" renk={R.ikincil}
                gorunur={d => d.adim >= 7 ? ara(d, 7, 0.4, 1.2) : 0} />
            <Yazi saat={saat} konum={[gen / 2 + 0.3, 0, 0.95]} hiza="left" boy={0.32}
                metin={mercek ? `${okunur(mercek[k].metin)}  ${yuzde(mercek[k].p, 0)}` : '…'}
                renk={k === L - 1 ? '#ff8fa3' : '#e8ecff'}
                gorunur={d => d.adim === 7 ? sinir(((sinir((d.t - 1.2) / 6.6)) * L - k) * 1.5) : d.adim > 7 ? 1 : 0} />
            <Yazi saat={saat} konum={[0, 0, 0.95]} metin={dl('dikkat + MLP', 'attention + MLP')} boy={0.2} renk="#a9b8ff" ince
                gorunur={d => d.adim >= 7 ? ara(d, 7, 0.6, 1.4) * 0.8 : 0} />
        </group>)}
        <mesh ref={kure}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color={R.odak.clone().multiplyScalar(2.4)} toneMapped={false} /></mesh>
        <Yazi saat={saat} konum={[gen / 2 + 0.3, yer(0) + 0.75, 0.95]} hiza="left" boy={0.22} renk={R.ikincil} ince
            metin={dl('bu bloktan sonraki tahmin', 'prediction after this block')} gorunur={d => d.adim >= 7 ? ara(d, 7, 1.6, 2.4) : 0} />
    </group>;
};

// ---------- olasılık çubukları ----------

const Cubuklar: React.FC<{ saat: Saat; veri: IHikayeVeri; y: IYerlesim }> = ({ saat, veri, y }) => {
    let o = veri.olasiliklar;
    let N = o.length;
    let adim = Math.min(1.15, (y.genislik + 8) / N);
    let xs = (i: number) => (i - (N - 1) / 2) * adim;
    let lmin = Math.min(...o.map(e => e.logit)), lmax = Math.max(...o.map(e => e.logit));
    let pmax = o[0]?.p ?? 1;
    let refs = useRef<(THREE.Mesh | null)[]>([]);
    let mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
    let degerRefs = useRef<any[]>([]);
    let kart = useRef<THREE.Group>(null);
    let kartGen = Math.max(1.8, okunur(o[0]?.metin ?? '').length * 0.32 + 0.6);
    let h0 = 0.06 + 5.4;   // en olası parçanın çubuğu (olasılık görünümünde en yüksek)
    useFrame(({ clock }) => {
        let d = saat.durum;
        let gor = d.adim >= 8 ? ara(d, 8, 0, 1.6) : 0;
        let sm = d.adim >= 8 ? ara(d, 8, 3, 5) : 0;
        refs.current.forEach((b, i) => {
            if (!b) return;
            let e = o[i];
            let hL = 0.3 + 4.2 * (e.logit - lmin) / Math.max(1e-6, lmax - lmin);
            let hP = 0.06 + 5.4 * e.p / pmax;
            let h = (hL + (hP - hL) * sm) * yumusak(gor * 1.4 - i * 0.02);
            b.visible = h > 0.01;
            b.scale.set(adim * 0.72, Math.max(h, 0.001), 0.5);
            b.position.set(xs(i), y.cubukY + h / 2, 0);
            let mt = mats.current[i];
            if (mt) {
                let secim = d.adim === 9 && i === 0 ? 1 + 0.5 * Math.sin(clock.elapsedTime * 5) : 0;
                let c = i === 0 ? R.odak : new THREE.Color().lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#33e0b0'), i / N);
                mt.color.copy(c).multiplyScalar(1.1 + (i < 3 ? 0.6 : 0) + secim * 0.8);
            }
        });
        degerRefs.current.forEach((t, i) => {
            if (!t) return;
            let e = o[i];
            let hL = 0.3 + 4.2 * (e.logit - lmin) / Math.max(1e-6, lmax - lmin);
            let hP = 0.06 + 5.4 * e.p / pmax;
            let h = hL + (hP - hL) * sm;
            t.position.set(xs(i), y.cubukY + h + 0.12, 0);
            let s = sm > 0.5 ? (i < 8 ? yuzde(e.p, 1) : '') : say(e.logit, 1);
            if (t.text !== s) { t.text = s; t.sync(); }
            let a = gor > 0.9 ? 1 : 0;
            t.visible = a > 0;
            t.fillOpacity = a;
        });
        // Seçim: en olası parça ilk çubuktan kalkar, üstte beliren cümlenin sonuna oturur
        if (kart.current) {
            let a = d.adim === 9 ? ara(d, 9, 0.6, 2) : 0;
            kart.current.visible = a > 0.01;
            kart.current.position.set(xs(0) * (1 - a) + (kartGen / 2) * a, y.cubukY + h0 + 0.7 + a * (6.8 - h0 - 0.7), 0.4);
            kart.current.scale.setScalar(0.6 + 0.4 * a);
        }
        if (cumle.current) {
            let a = d.adim === 9 ? ara(d, 9, 0.2, 1) : 0;
            cumle.current.visible = a > 0.01;
            cumle.current.fillOpacity = a;
        }
    });
    let grup = useRef<THREE.Group>(null);
    let cumle = useRef<any>(null);
    useFrame(() => { if (grup.current) grup.current.visible = saat.durum.adim >= 8; });
    return <group ref={grup}>
        {o.map((e, i) => <mesh key={i} ref={r => { refs.current[i] = r; }} geometry={KUTU}>
            <meshBasicMaterial ref={r => { mats.current[i] = r; }} toneMapped={false} />
        </mesh>)}
        {o.map((e, i) => <Text key={'d' + i} ref={(r: any) => { degerRefs.current[i] = r; }} font={FONT_INCE} fontSize={0.22} color="#dfe6ff"
            anchorX="center" anchorY="bottom" outlineWidth={0.015} outlineColor={R.zemin}> </Text>)}
        {o.map((e, i) => <Yazi key={'t' + i} saat={saat} konum={[xs(i) + 0.08, y.cubukY - 0.18, 0]} metin={okunur(e.metin).slice(0, 12)} boy={0.24}
            hiza="right" dikey="top" donus={[0, 0, Math.PI / 3]} renk={i === 0 ? '#ff8fa3' : '#d6ddff'}
            gorunur={d => d.adim >= 8 ? ara(d, 8, 1, 1.8) : 0} />)}
        <Yazi saat={saat} konum={[xs(N - 1) + 0.6, y.cubukY + 0.3, 0]} metin="logit" boy={0.26} hiza="left" renk={R.ikincil} ince
            gorunur={d => d.adim === 8 ? ara(d, 8, 1, 1.8) * (1 - ara(d, 8, 3, 3.6)) : 0} />
        <Yazi saat={saat} konum={[xs(N - 1) + 0.6, y.cubukY + 0.3, 0]} metin={dl('olasılık', 'probability')} boy={0.26} hiza="left" renk={R.ikincil} ince
            gorunur={d => d.adim >= 8 ? ara(d, 8, 4, 4.8) : 0} />
        <Text ref={cumle} font={FONT} fontSize={0.5} color="#e8ecff" position={[-0.25, y.cubukY + 6.8, 0.4]} anchorX="right" anchorY="middle"
            outlineWidth={0.03} outlineColor={R.zemin}>{veri.tokenler.join('').trim()}</Text>
        <group ref={kart}>
            <RoundedBox args={[kartGen, 0.9, 0.2]} radius={0.12}>
                <meshBasicMaterial color={R.odak.clone().multiplyScalar(1.6)} toneMapped={false} />
            </RoundedBox>
            <Text font={FONT} fontSize={0.44} color="#ffffff" position={[0, 0, 0.12]} anchorX="center" anchorY="middle">{okunur(o[0]?.metin ?? '')}</Text>
            <Text font={FONT_INCE} fontSize={0.24} color="#ffd0d8" position={[0, -0.75, 0.12]} anchorX="center" anchorY="middle">{dl('cümleye eklenir', 'appended')}</Text>
        </group>
    </group>;
};

// ---------- kamera ve saat ----------

const KameraYonetici: React.FC<{ saat: Saat; y: IYerlesim; kontrol: React.MutableRefObject<CameraControls | null>; bosluk: { sag: number; alt: number; sol?: number } }> = ({ saat, y, kontrol, bosluk }) => {
    let { size, camera } = useThree();
    // Arayüz panelleri (sağda cümle paneli, altta altyazı) sahnenin bir kısmını örter: görüntünün merkezini
    // boş kalan alanın ortasına kaydır (setViewOffset)
    React.useEffect(() => {
        let c = camera as THREE.PerspectiveCamera;
        let genis = size.width > 760;
        c.setViewOffset(size.width, size.height, genis ? (bosluk.sag - (bosluk.sol ?? 0)) / 2 : 0, bosluk.alt / 2, size.width, size.height);
        c.updateProjectionMatrix();
    }, [camera, size.width, size.height, bosluk.sag, bosluk.alt, bosluk.sol]);
    let onceki = useRef<string>('');
    useFrame((_, dt) => {
        saat.ilerlet(Math.min(dt, 0.1));
        let d = saat.durum;
        let anahtar = `${d.adim}|${d.kameraSayac}|${y.n}|${Math.round(size.width / 50)}|${bosluk.sol}`;
        if (anahtar !== onceki.current && kontrol.current) {
            let ilk = onceki.current === '';
            onceki.current = anahtar;
            let { poz, hedef } = ADIMLAR[d.adim].kamera(y);
            // dar ekranda (telefon, dikey) geri çekil
            let en = size.width / Math.max(1, size.height);
            let k = en < 1.2 ? 1 + (1.2 - en) * 1.1 : 1;
            // sol mimari haritası açıkken görünür alan daralır: biraz geri çekil
            if ((bosluk.sol ?? 0) > 0 && size.width > 760) k *= 1 + (bosluk.sol ?? 0) / size.width * 0.9;
            let p = [hedef[0] + (poz[0] - hedef[0]) * k, hedef[1] + (poz[1] - hedef[1]) * k, hedef[2] + (poz[2] - hedef[2]) * k];
            kontrol.current.setLookAt(p[0], p[1], p[2], hedef[0], hedef[1], hedef[2], !ilk);
        }
    });
    return null;
};

export const Sahne: React.FC<{ saat: Saat; veri: IHikayeVeri; kontrol: React.MutableRefObject<CameraControls | null>; bosluk: { sag: number; alt: number; sol?: number } }> = ({ saat, veri, kontrol, bosluk }) => {
    let y = useMemo(() => yerlesim(veri.n), [veri.n]);
    return <Canvas dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 400, position: [0, 4, 30] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <color attach="background" args={[R.zemin]} />
        <fog attach="fog" args={[R.zemin, 38, 110]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 12, 10]} intensity={1.1} />
        <pointLight position={[-10, 6, 8]} intensity={40} color="#5d7cff" />
        <Sparkles count={70} scale={[60, 50, 20]} position={[0, -8, -8]} size={2.2} speed={0.25} opacity={0.35} color="#8fa8ff" />
        {veri.tokenler.map((_, j) => <Kart key={j + ':' + veri.ids[j]} saat={saat} veri={veri} y={y} j={j} />)}
        <Gomme saat={saat} veri={veri} y={y} />
        <Dikkat saat={saat} veri={veri} y={y} />
        <Mlp saat={saat} veri={veri} y={y} />
        <Kule saat={saat} veri={veri} y={y} />
        <Cubuklar saat={saat} veri={veri} y={y} />
        <CameraControls ref={kontrol} smoothTime={0.75} minDistance={2} maxDistance={140} />
        <KameraYonetici saat={saat} y={y} kontrol={kontrol} bosluk={bosluk} />
        <EffectComposer>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.7} />
            <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
    </Canvas>;
};

