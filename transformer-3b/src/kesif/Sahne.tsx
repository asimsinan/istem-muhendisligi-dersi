'use client';
// TR: Keşif modu sahnesi. Açık zemin, oyuncak gibi yumuşak nesneler: altta parçalar, üstlerinde 12 blok katmanı,
// seçili parçanın bloklar boyunca yolu (kesikli mavi). Mimari yolculuğunda seçili blok "açılır": içindeki 12 adım
// (norm, Q/K/V, skor, softmax, ... MLP, artık) seçili parçanın sütununda katman katman görünür. Girişte gömme
// tablosu, tepede son norm ve logit katmanı vardır. Her nesneye tıklanabilir; kamera seçime yumuşakça gider.
import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, Edges, Html, Line, QuadraticBezierLine, RoundedBox, Text } from '@react-three/drei';
import { yol } from '@/src/llm/tr/yol';
import { L } from '@/src/llm/tr/dil';
import { yuzde } from '@/src/hikaye/veri';
import { IAday } from './veri';
import { ASAMALAR, ILK_BLOK_ADIMI, SON_BLOK_ADIMI, blokAdimiMi } from './asamalar';
import s from './kesif.module.scss';

const okunur = (t: string) => t.replace('<|endoftext|>', L('[metin sonu]', '[end of text]')).replace(/\n/g, '¶').trim() || '␣';
const FONT = yol('/fonts/hikaye/Inter-600.ttf');
export const R = {
    zemin: '#EEF0F8',
    izgara: '#DDE1EF',
    kutu: '#FFFFFF',
    secili: '#E11D48',
    seciliZemin: '#FFF1F3',
    blok: '#AEB7F5',
    blokSecili: '#5B6CF0',
    mavi: '#2F54EB',
    yay: '#F59E0B',
    yayGuclu: '#EA580C',
    yazi: '#1D2340',
    ikincil: '#8A92B8',
    q: '#F43F5E', k: '#22C55E', v: '#3B82F6',
};

export const DX = 2.1, Y0 = 1.35, DY = 0.42;
const PY = 0.36, ACIK_ALT = 0.3, ACIK_H = ACIK_ALT + 12 * PY + 0.15;
export const xKonum = (i: number, n: number) => (i - (n - 1) / 2) * DX;
/** blok yüksekliği: açık bloğun üstündekiler yukarı kayar */
const yBlokF = (acik: number) => (l: number) => Y0 + l * DY + (acik >= 0 && l > acik ? ACIK_H : 0);
/** açık blok içindeki k. adımın yüksekliği */
const yIc = (y0: number, k: number) => y0 + ACIK_ALT + k * PY;

export interface ISahneProps {
    tokenler: string[];
    ids: number[];
    L: number;
    V: number;
    secili: number;
    blok: number;
    adim: number;
    dikkat: number[];            // seçili parçanın seçili blok/baştaki payları (j ≤ secili)
    tumBaslar: number[][];       // aynı satır 12 başın hepsi için
    bas: number;
    onBas: (h: number) => void;
    adaylar: IAday[];
    onParca: (i: number) => void;
    onBlok: (l: number) => void;
    onAdim: (a: number) => void;
    kontrol: React.MutableRefObject<CameraControls | null>;
    genel: boolean;              // genel görünüm: bütün model ekrana sığar
    genelNo: number;             // ⌂ her basıldığında artar (yeniden sığdır)
    bosluk: IBosluk;             // panellerin kapladığı alan (px): sahnenin merkezi boş kalan yere kayar
}
export interface IBosluk { sag: number; alt: number; ust: number }

const isaretle = {
    onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = ''; },
};

const Parca: React.FC<{ i: number; n: number; metin: string; secili: boolean; onClick: () => void }> = ({ i, n, metin, secili, onClick }) => {
    let [ustte, setUstte] = useState(false);
    let x = xKonum(i, n);
    let gor = okunur(metin);
    return <group position={[x, 0.27, 0]}
        onClick={e => { e.stopPropagation(); onClick(); }}
        onPointerOver={e => { e.stopPropagation(); setUstte(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setUstte(false); document.body.style.cursor = ''; }}>
        <RoundedBox args={[1.7, 0.54, 1.15]} radius={0.12} smoothness={4}>
            <meshStandardMaterial color={secili ? R.seciliZemin : ustte ? '#F4F6FF' : R.kutu} roughness={0.6} />
        </RoundedBox>
        <Text font={FONT} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={Math.min(0.5, 2.6 / Math.max(3, gor.length))}
            color={secili ? R.secili : R.yazi} anchorX="center" anchorY="middle">{gor}</Text>
    </group>;
};

const Bloklar: React.FC<{ n: number; L: number; blok: number; acik: number; soluk: boolean; yb: (l: number) => number; onBlok: (l: number) => void }> = ({ n, L: nL, blok, acik, soluk, yb, onBlok }) => {
    let g = n * DX + 0.4;
    let x0 = -g / 2;
    return <group>
        {Array.from({ length: nL }, (_, l) => {
            let sec = l === blok, ac = l === acik;
            return <group key={l} position={[0, yb(l), 0]}>
                <mesh onClick={e => { e.stopPropagation(); onBlok(l); }} {...isaretle}>
                    <boxGeometry args={[g, 0.07, 1.7]} />
                    <meshStandardMaterial color={sec ? R.blokSecili : R.blok} transparent opacity={soluk ? 0.06 : sec ? 0.45 : 0.16} depthWrite={false} />
                </mesh>
                {ac && <mesh position={[0, ACIK_H / 2, 0]} raycast={() => null}>
                    <boxGeometry args={[g, ACIK_H, 1.7]} />
                    <meshStandardMaterial color={R.blokSecili} transparent opacity={0.05} depthWrite={false} />
                    <Edges color="#8D99F2" />
                </mesh>}
                <Text font={FONT} position={[x0 - 0.15, 0, 0.85]} fontSize={sec ? 0.26 : 0.2} color={sec ? '#2F3BB8' : R.ikincil} anchorX="right" anchorY="middle">
                    {L(`Blok ${l + 1}`, `Block ${l + 1}`)}
                </Text>
                {ac && <Text font={FONT} position={[x0 - 0.15, ACIK_H - 0.15, 0.85]} fontSize={0.17} color="#5B6CF0" anchorX="right" anchorY="middle">
                    {L(`Blok ${l + 1}'in içi`, `Inside block ${l + 1}`)}
                </Text>}
            </group>;
        })}
    </group>;
};

const Yol: React.FC<{ x: number; L: number; blok: number; yb: (l: number) => number; ust: number }> = ({ x, L: nL, blok, yb, ust }) => <group>
    <Line points={[[x, 0.55, 0], [x, ust, 0]]} color={R.mavi} lineWidth={2.5} dashed dashSize={0.08} gapSize={0.16} />
    {Array.from({ length: nL }, (_, l) => <mesh key={l} position={[x, yb(l), 0]}>
        <sphereGeometry args={[l === blok ? 0.13 : 0.08, 20, 20]} />
        <meshStandardMaterial color={l <= blok ? R.mavi : '#FFFFFF'} emissive={l === blok ? R.mavi : '#000000'} emissiveIntensity={0.25} />
    </mesh>)}
</group>;

/** bir adım plakası: seçili sütunda, tıklanınca o adıma gider. Geniş plakalar (MLP 3.072, logit 50.257) geriye doğru uzar. */
const Plaka: React.FC<{ x: number; y: number; a: number; adim: number; renk: string; boy?: [number, number, number]; etiket?: string; onAdim: (a: number) => void }> =
    ({ x, y, a, adim, renk, boy = [1.5, 0.1, 1.0], etiket, onAdim }) => {
        let akt = a === adim;
        return <group position={[x, y, 0]}>
            <RoundedBox args={boy} radius={0.04} smoothness={3} scale={akt ? 1.08 : 1} position={[0, 0, -(boy[2] - 1) / 2]}
                onClick={e => { e.stopPropagation(); onAdim(a); }} {...isaretle}>
                <meshStandardMaterial color={renk} transparent opacity={akt ? 1 : 0.55} emissive={akt ? renk : '#000000'} emissiveIntensity={akt ? 0.25 : 0} />
            </RoundedBox>
            <Text font={FONT} position={[-boy[0] / 2 - 0.12, 0, 0.55]} fontSize={akt ? 0.19 : 0.15} color={akt ? R.mavi : R.ikincil} anchorX="right" anchorY="middle">
                {etiket ?? ASAMALAR[a].kisa}
            </Text>
        </group>;
    };

const Arti: React.FC<{ x: number; y: number; a: number; adim: number; onAdim: (a: number) => void }> = ({ x, y, a, adim, onAdim }) => {
    let akt = a === adim;
    return <group position={[x, y, 0]}>
        <mesh onClick={e => { e.stopPropagation(); onAdim(a); }} {...isaretle}>
            <sphereGeometry args={[akt ? 0.2 : 0.16, 24, 24]} />
            <meshStandardMaterial color={akt ? R.mavi : '#FFFFFF'} />
        </mesh>
        <Text font={FONT} position={[0, 0, 0.21]} fontSize={0.26} color={akt ? '#FFFFFF' : R.mavi} anchorX="center" anchorY="middle">+</Text>
        <Text font={FONT} position={[-0.87, 0, 0.45]} fontSize={akt ? 0.19 : 0.15} color={akt ? R.mavi : R.ikincil} anchorX="right" anchorY="middle">{ASAMALAR[a].kisa}</Text>
    </group>;
};

/** baş derinliği: h. baş, sütunun arkasına doğru z = -h·DZ düzleminde */
const DZ = 0.42;
const zBas = (h: number) => -h * DZ;
const basRengi = (h: number) => `hsl(${(h * 360) / 12 + 200}, 65%, 62%)`;

/** dikkat adımları (skor, softmax, V toplamı): tek plaka yerine arka arkaya 12 ince plaka = paralel çalışan 12 baş */
const BasPlakalari: React.FC<{ x: number; y: number; a: number; adim: number; renk: string; H: number; bas: number; onAdim: (a: number) => void; onBas: (h: number) => void }> =
    ({ x, y, a, adim, renk, H, bas, onAdim, onBas }) => {
        let akt = a === adim, etiketli = akt || adim === a + 1;
        return <group position={[x, y, 0]}>
            {Array.from({ length: H }, (_, h) => {
                let sec = h === bas;
                return <group key={h} position={[0, 0, zBas(h)]}>
                    <RoundedBox args={[1.5, sec ? 0.12 : 0.08, DZ * 0.8]} radius={0.02} smoothness={2}
                        onClick={e => { e.stopPropagation(); onBas(h); onAdim(a); }} {...isaretle}>
                        <meshStandardMaterial color={sec ? (akt ? '#EA580C' : '#FDBA74') : renk} transparent opacity={sec ? 1 : akt ? 0.55 : 0.3}
                            emissive={sec && akt ? '#EA580C' : '#000000'} emissiveIntensity={0.25} />
                    </RoundedBox>
                    {etiketli && <Text font={FONT} position={[0.86, 0, 0]} fontSize={sec ? 0.14 : 0.1} color={sec ? '#C2410C' : R.ikincil} anchorX="left" anchorY="middle">
                        {L(`Baş ${h + 1}`, `Head ${h + 1}`)}</Text>}
                </group>;
            })}
            <Text font={FONT} position={[-0.87, 0, 0.55]} fontSize={akt ? 0.19 : 0.15} color={akt ? R.mavi : R.ikincil} anchorX="right" anchorY="middle">{ASAMALAR[a].kisa}</Text>
        </group>;
    };

/** öteki 11 başın yayları: kendi düzlemlerinde, ince ve soluk (seçili baş ayrıca kalın çizilir) */
const OtekiBaslar: React.FC<{ n: number; secili: number; yBas: number; ySon: number; tum: number[][]; bas: number }> = ({ n, secili, yBas, ySon, tum, bas }) => {
    let x0 = xKonum(secili, n);
    return <group>
        {tum.map((satir, h) => h === bas ? null : satir.map((p, j) => {
            if (j === secili || p < 0.12) return null;
            let x1 = xKonum(j, n), z = zBas(h), yuk = 0.4 + Math.abs(x0 - x1) * 0.1 + p * 1.6;
            return <QuadraticBezierLine key={h + ':' + j} start={[x0, yBas, z]} end={[x1, ySon, z]} mid={[(x0 + x1) / 2, Math.max(yBas, ySon) + yuk, z]}
                color={basRengi(h)} lineWidth={0.8 + p * 4} transparent opacity={0.25 + p * 0.5} />;
        }))}
    </group>;
};

/** birleşme: 12 başın çıktıları (64'er sayı) arka arkaya, birleş plakasına akar */
const Birlesme: React.FC<{ x: number; yV: number; yB: number; H: number; bas: number }> = ({ x, yV, yB, H, bas }) => <group>
    {Array.from({ length: H }, (_, h) => <Line key={h} points={[[x, yV, zBas(h)], [x, yB, 0]]} color={h === bas ? '#EA580C' : basRengi(h)} lineWidth={h === bas ? 4 : 2.2} />)}
</group>;

/** açık bloğun içi: 12 adım seçili sütunda; önceki parçaların K ve V'si soluk kutular */
const AcikBlok: React.FC<{ y0: number; n: number; secili: number; adim: number; H: number; bas: number; onAdim: (a: number) => void; onBas: (h: number) => void }> = ({ y0, n, secili, adim, H, bas, onAdim, onBas }) => {
    let x = xKonum(secili, n), A = ILK_BLOK_ADIMI;
    let y = (k: number) => yIc(y0, k);
    let p = (k: number, renk: string, boy?: [number, number, number]) => <Plaka key={k} x={x} y={y(k)} a={A + k} adim={adim} renk={renk} boy={boy} onAdim={onAdim} />;
    let qkvAkt = adim === A + 1;
    let kvGoster = adim >= A + 1 && adim <= A + 4;
    return <group>
        {p(0, '#CBD2EA')}
        {/* Q K V: üç küçük kutu */}
        <group position={[0, y(1), 0]}>
            {([['Q', R.q, -0.52], ['K', R.k, 0], ['V', R.v, 0.52]] as const).map(([ad, renk, dx]) => <group key={ad} position={[x + dx, 0, 0]}>
                <RoundedBox args={[0.44, 0.16, 0.9]} radius={0.04} scale={qkvAkt ? 1.08 : 1} onClick={e => { e.stopPropagation(); onAdim(A + 1); }} {...isaretle}>
                    <meshStandardMaterial color={renk} transparent opacity={qkvAkt ? 1 : 0.6} />
                </RoundedBox>
                <Text font={FONT} position={[0, 0.09, 0.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color="#FFFFFF" anchorX="center" anchorY="middle">{ad}</Text>
            </group>)}
            <Text font={FONT} position={[x - 0.87, 0, 0.45]} fontSize={qkvAkt ? 0.19 : 0.15} color={qkvAkt ? R.mavi : R.ikincil} anchorX="right" anchorY="middle">Q K V</Text>
            {kvGoster && Array.from({ length: secili }, (_, j) => <group key={j} position={[xKonum(j, n), 0, 0]}>
                {/* K ve V, 12 başın hepsi için: sütunun arkasına doğru uzanır */}
                <mesh position={[-0.24, 0, 0.4 - 6 * DZ]}><boxGeometry args={[0.4, 0.12, 12 * DZ]} /><meshStandardMaterial color={R.k} transparent opacity={0.3} /></mesh>
                <mesh position={[0.24, 0, 0.4 - 6 * DZ]}><boxGeometry args={[0.4, 0.12, 12 * DZ]} /><meshStandardMaterial color={R.v} transparent opacity={0.3} /></mesh>
            </group>)}
        </group>
        {/* dikkat plakaları: etkin olan (birleşmede V toplamı) 12 başa ayrılır, ötekiler tek plaka */}
        {([[2, '#FDBA74'], [3, '#FB923C'], [4, '#93C5FD']] as [number, string][]).map(([k, renk]) =>
            A + k === adim || (k === 4 && adim === A + 5)
                ? <BasPlakalari key={k} x={x} y={y(k)} a={A + k} adim={adim} renk={renk} H={H} bas={bas} onAdim={onAdim} onBas={onBas} />
                : p(k, renk))}
        {adim === A + 5 && <Birlesme x={x} yV={y(4)} yB={y(5)} H={H} bas={bas} />}
        {p(5, '#A5B4FC', [1.7, 0.12, 1.2])}
        <Arti x={x} y={y(6)} a={A + 6} adim={adim} onAdim={onAdim} />
        {p(7, '#CBD2EA')}
        {p(8, '#FCA5A5', [1.5, 0.12, 3.6])}
        {p(9, '#FB7185', [1.5, 0.12, 3.6])}
        {p(10, '#FCA5A5')}
        <Arti x={x} y={y(11)} a={A + 11} adim={adim} onAdim={onAdim} />
    </group>;
};

const Yaylar: React.FC<{ n: number; secili: number; yBas: number; ySon: number; z: number; dikkat: number[] }> = ({ n, secili, yBas, ySon, z, dikkat }) => {
    let x0 = xKonum(secili, n);
    let enIyi = -1;
    dikkat.forEach((p, j) => { if (j !== secili && (enIyi < 0 || p > dikkat[enIyi])) enIyi = j; });
    return <group>
        {dikkat.map((p, j) => {
            if (j === secili) return null;
            let x1 = xKonum(j, n), mx = (x0 + x1) / 2, yuk = 0.5 + Math.abs(x0 - x1) * 0.12 + p * 2.2;
            let ym = Math.max(yBas, ySon) + yuk;
            let guclu = j === enIyi;
            return <group key={j}>
                <QuadraticBezierLine start={[x0, yBas, z]} end={[x1, ySon, z]} mid={[mx, ym, z]}
                    color={guclu ? R.yayGuclu : R.yay} lineWidth={1 + p * 14} transparent opacity={guclu ? 0.95 : 0.35 + p * 1.2} />
                {p >= 0.08 && <Html position={[mx, (ym + yBas) / 2 + 0.12, z]} center zIndexRange={[10, 0]}>
                    <span className={s.payCip} style={{ borderColor: guclu ? R.yayGuclu : R.yay }}>{yuzde(p, 0)}</span>
                </Html>}
            </group>;
        })}
        {dikkat[secili] >= 0.08 && <Html position={[x0 - 1.0, yBas + 0.25, z]} center zIndexRange={[10, 0]}>
            <span className={s.payCip} title={L('kendisine', 'itself')}>↺ {yuzde(dikkat[secili], 0)}</span>
        </Html>}
    </group>;
};

/** giriş: gömme tablosu (parçaların arkasında bir duvar), okunan satır ve konum */
const Giris: React.FC<{ x: number; id: number; V: number; i: number; adim: number; genis: number; onAdim: (a: number) => void }> = ({ x, id, V, i, adim, genis, onAdim }) => {
    let z = -2.6, yA = 0.08, yU = 1.0;
    let ySat = yA + (1 - id / V) * (yU - yA);
    return <group>
        <mesh position={[0, (yA + yU) / 2, z]} onClick={e => { e.stopPropagation(); onAdim(1); }} {...isaretle}>
            <boxGeometry args={[genis, yU - yA, 0.08]} />
            <meshStandardMaterial color="#E0E7FF" emissive="#C7D2FE" emissiveIntensity={0.5} transparent opacity={adim === 1 ? 0.95 : 0.6} />
        </mesh>
        <mesh position={[0, ySat, z + 0.06]}><boxGeometry args={[genis, 0.05, 0.02]} /><meshStandardMaterial color={R.mavi} /></mesh>
        <Line points={[[x, ySat, z + 0.05], [x, 0.6, -0.3]]} color={R.mavi} lineWidth={2} dashed dashSize={0.06} gapSize={0.08} />
        <Html position={[x, ySat + 0.22, z]} center zIndexRange={[10, 0]}><span className={s.payCip} style={{ borderColor: R.mavi, color: R.mavi }}>{L(`Gömme tablosu (${V.toLocaleString('tr-TR')} × 768) · satır #${id}`, `Embedding table (${V.toLocaleString('en-US')} × 768) · row #${id}`)}</span></Html>
        {adim === 2 && <Html position={[x + 1.15, 0.85, 0.3]} center zIndexRange={[10, 0]}><span className={s.payCip} style={{ borderColor: R.mavi, color: R.mavi }}>+ {L('konum', 'position')} {i + 1}</span></Html>}
    </group>;
};

/** çıkış: son norm ve 50.257 puanlık logit katmanı */
const Cikis: React.FC<{ x: number; yT: number; adim: number; onAdim: (a: number) => void }> = ({ x, yT, adim, onAdim }) => <group>
    <Plaka x={x} y={yT + 0.5} a={15} adim={adim} renk="#CBD2EA" onAdim={onAdim} />
    <Plaka x={x} y={yT + 0.95} a={16} adim={adim} renk="#E879F9" boy={[1.5, 0.12, 4.4]} etiket={L('Logit (50.257)', 'Logits (50,257)')} onAdim={onAdim} />
    <Plaka x={x} y={yT + 1.4} a={17} adim={adim} renk="#F0ABFC" boy={[1.5, 0.1, 1.0]} onAdim={onAdim} />
</group>;

const Secim: React.FC<{ x: number; etiket: string }> = ({ x, etiket }) => {
    let w = 1.0, a = 0.22, yA = -0.02, yU = 0.62, z = 0.62;
    let k = (cx: number, cy: number, sx: number, sy: number) => [[cx, cy + sy * a, z], [cx, cy, z], [cx + sx * a, cy, z]] as [number, number, number][];
    return <group position={[x, 0, 0]}>
        {[k(-w, yU, 1, -1), k(w, yU, -1, -1), k(-w, yA, 1, 1), k(w, yA, -1, 1)].map((p, i) => <Line key={i} points={p} color={R.mavi} lineWidth={3} />)}
        <Html position={[0, -0.35, 0.7]} center zIndexRange={[12, 0]}>
            <span className={s.secimEtiket}>{etiket}</span>
        </Html>
    </group>;
};

const Balon: React.FC<{ x: number; y: number; adaylar: IAday[]; onClick: () => void }> = ({ x, y, adaylar, onClick }) => {
    let mx = adaylar[0]?.p ?? 1;
    // Anchored by its left edge just right of the plate column (half width 0.75),
    // so the card grows to the right and never covers the plates or their labels,
    // whatever the camera distance.
    return <Html position={[x + 0.95, y, 0]} zIndexRange={[12, 0]}>
        <div className={s.balon} onClick={onClick} style={{ pointerEvents: 'auto', cursor: 'pointer', transform: 'translateY(-50%)' }}>
            <div className={s.balonBas}>{L('SIRADAKİ PARÇA', 'NEXT TOKEN')}</div>
            {adaylar.slice(0, 3).map((a, i) => <div key={a.id} className={s.balonSatir}>
                <code>{okunur(a.metin)}</code>
                <span className={s.balonCubuk}><i style={{ width: `${(a.p / mx) * 100}%`, background: i === 0 ? R.secili : R.blok }} /></span>
                <span>{yuzde(a.p, 0)}</span>
            </div>)}
        </div>
    </Html>;
};

/** kameranın baktığı nokta ve uzaklığı: adıma göre */
function odak(adim: number, x: number, n: number, blok: number, yb: (l: number) => number, yT: number): { y: number; uzak: number; yuk: number; yan?: boolean } {
    if (adim <= 2) return { y: 0.5, uzak: 9 + n * 0.45, yuk: 2.4 };
    // dikkat adımlarında 12 baş arka arkaya dizili: yandan bakılınca katmanlar ayrışır
    if (adim >= ILK_BLOK_ADIMI + 2 && adim <= ILK_BLOK_ADIMI + 5) return { y: yIc(yb(blok), adim - ILK_BLOK_ADIMI), uzak: 10 + n * 0.5, yuk: 3.0, yan: true };
    if (blokAdimiMi(adim)) return { y: yIc(yb(blok), adim - ILK_BLOK_ADIMI), uzak: 10 + n * 0.5, yuk: 3.0 };
    return { y: yT + 0.9, uzak: 10 + n * 0.5, yuk: 3.2 };
}

/** Kamera iki kipte çalışır. Genel: bütün model (parçalar, 12 blok, çıkış) panellerin bıraktığı boş alana sığar ve
 *  ortalanır (açılışta ve ⌂ ile). Odak: seçili adıma yakından bakar (adım, parça ya da blok seçilince). */
const Kamera: React.FC<{
    kontrol: React.MutableRefObject<CameraControls | null>; x: number; y: number; uzak: number; yuk: number; yan?: boolean;
    genel: boolean; genelNo: number; kutu: [number, number, number, number, number, number]; bosluk: IBosluk;
}> = ({ kontrol, x, y, uzak, yuk, yan, genel, genelNo, kutu, bosluk }) => {
    let ilk = React.useRef(true);
    let { size } = useThree();
    let [x0, y0, z0, x1, y1, z1] = kutu;
    useEffect(() => {
        let c = kontrol.current;
        if (!c) return;
        let gecis = !ilk.current;
        ilk.current = false;
        if (genel) {
            let sag = (size.width > 1100 ? bosluk.sag : 0) + 64; // + kamera düğmeleri
            let alt = size.width > 1100 ? bosluk.alt : Math.min(bosluk.alt, 120);
            let fw = Math.max(0.3, (size.width - sag - 24) / size.width), fh = Math.max(0.3, (size.height - alt - bosluk.ust - 24) / size.height);
            // camera-controls'un fitToBox'ı açıyı 90°'ye yuvarlar (düz önden görünüm); uzaklığı kendimiz hesaplarız
            let tet = -0.34, fi = 1.2;                                   // yatay açı, tepeden açı
            let dx = Math.sin(fi) * Math.sin(tet), dy = Math.cos(fi), dz = Math.sin(fi) * Math.cos(tet);
            let bw = x1 - x0, bh = y1 - y0, bd = z1 - z0;
            let gorW = bw * Math.cos(tet) + bd * Math.abs(Math.sin(tet));   // ekrandaki yaklaşık genişlik
            let gorH = bh * Math.sin(fi) + bd * Math.cos(fi);              // ekrandaki yaklaşık yükseklik
            let vfov = (32 * Math.PI) / 180, tv = Math.tan(vfov / 2), th = tv * (size.width / size.height);
            let d = Math.max(gorW / 2 / (th * fw), gorH / 2 / (tv * fh)) * 1.1 + bd / 2;
            let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
            c.setLookAt(cx + dx * d, cy + dy * d, cz + dz * d, cx, cy, cz, gecis);
            return;
        }
        if (yan) c.setLookAt(x + 9.5, y + 5.2, 8.5, x - 1.6, y + 0.4, -2.4, gecis);
        else c.setLookAt(x - 4.2, y + yuk, uzak, x * 0.85, y, 0, gecis);
    }, [kontrol, x, y, uzak, yuk, yan, genel, genelNo, x0, y0, z0, x1, y1, z1, size.width, size.height, bosluk.sag, bosluk.alt, bosluk.ust]);
    return null;
};

// Paneller sahnenin bir kısmını örter: görüntünün merkezini boş kalan alana kaydır (sağda inceleme kartı, altta şerit)
const GorusKaydir: React.FC<{ bosluk: IBosluk }> = ({ bosluk }) => {
    let { camera, size } = useThree();
    useEffect(() => {
        let c = camera as any;
        let genis = size.width > 1100, sag = genis ? bosluk.sag : 0, alt = genis ? bosluk.alt : Math.min(bosluk.alt, 120), ust = bosluk.ust;
        c.setViewOffset(size.width, size.height, sag / 2, (alt - ust) / 2, size.width, size.height);
        c.updateProjectionMatrix();
    }, [camera, size.width, size.height, bosluk.sag, bosluk.alt, bosluk.ust]);
    return null;
};

export const KesifSahne: React.FC<ISahneProps> = ({ tokenler, ids, L: nL, V, secili, blok, adim, dikkat, tumBaslar, bas, onBas, adaylar, onParca, onBlok, onAdim, kontrol, bosluk, genel, genelNo }) => {
    let n = tokenler.length;
    let x = xKonum(secili, n);
    let acik = blokAdimiMi(adim) ? blok : -1;
    let yb = useMemo(() => yBlokF(acik), [acik]);
    let yT = yb(nL - 1);
    let zemin = useMemo(() => n * DX + 4, [n]);
    let A = ILK_BLOK_ADIMI;
    let etiket = `${okunur(tokenler[secili])} · #${ids[secili]} · ${blokAdimiMi(adim) ? L(`Blok ${blok + 1}`, `Block ${blok + 1}`) + ' · ' : ''}${ASAMALAR[adim].kisa}`;
    let yayGoster = acik >= 0 && adim >= A + 2 && adim <= A + 4;
    let o = odak(adim, x, n, blok, yb, yT);
    // bütün modelin kutusu: soldaki "Blok k" yazıları, parçalar, bloklar, tepedeki çıkış plakaları
    let kutu: [number, number, number, number, number, number] = [-(n * DX) / 2 - 1.5, 0, -1.2, (n * DX) / 2 + 0.3 + (secili === n - 1 ? 2.6 : 0), yT + 1.9, 1.0]; // sağda balon
    return <Canvas dpr={[1, 2]} camera={{ fov: 32, near: 0.1, far: 300, position: [-6, 9, 20] }} gl={{ antialias: true }}>
        <color attach="background" args={[R.zemin]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[-6, 14, 10]} intensity={1.4} />
        <directionalLight position={[8, 6, -6]} intensity={0.35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[zemin, 6]} />
            <meshStandardMaterial color="#E6E9F5" />
        </mesh>
        <gridHelper args={[zemin, Math.round(zemin / 1.05), R.izgara, R.izgara]} position={[0, 0.005, 0]} scale={[1, 1, 6 / zemin]} />
        {adim >= 1 && adim <= 2 && <Giris x={x} id={ids[secili]} V={V} i={secili} adim={adim} genis={n * DX} onAdim={onAdim} />}
        <Bloklar n={n} L={nL} blok={blok} acik={acik} soluk={adim <= 2} yb={yb} onBlok={onBlok} />
        {acik >= 0 && <AcikBlok y0={yb(acik)} n={n} secili={secili} adim={adim} H={tumBaslar.length} bas={bas} onAdim={onAdim} onBas={onBas} />}
        {tokenler.map((t, i) => <Parca key={i + ':' + ids[i]} i={i} n={n} metin={t} secili={i === secili} onClick={() => onParca(i)} />)}
        <Yol x={x} L={nL} blok={blok} yb={yb} ust={yT + 1.5} />
        {yayGoster && <>
            <Yaylar n={n} secili={secili} yBas={yIc(yb(acik), adim - A)} ySon={yIc(yb(acik), 1)} z={zBas(bas)} dikkat={dikkat} />
            <OtekiBaslar n={n} secili={secili} yBas={yIc(yb(acik), adim - A)} ySon={yIc(yb(acik), 1)} tum={tumBaslar} bas={bas} />
        </>}
        <Cikis x={x} yT={yT} adim={adim} onAdim={onAdim} />
        <Secim x={x} etiket={etiket} />
        <Balon x={x} y={yT + 1.75} adaylar={adaylar} onClick={() => onAdim(18)} />
        <CameraControls ref={kontrol} smoothTime={0.6} minDistance={3} maxDistance={90} />
        <Kamera kontrol={kontrol} x={x} y={o.y} uzak={o.uzak} yuk={o.yuk} yan={o.yan} genel={genel} genelNo={genelNo} kutu={kutu} bosluk={bosluk} />
        <GorusKaydir bosluk={bosluk} />
    </Canvas>;
};

export const yakinlas = (c: CameraControls | null, k: number) => c?.dolly(k, true);
export const dondur = (c: CameraControls | null, a: number) => c?.rotate(a, 0, true);
export { SON_BLOK_ADIMI };
