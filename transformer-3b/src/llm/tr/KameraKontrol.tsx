'use client';
// TR: Kamera düğmeleri (yakınlaş/uzaklaş, döndür, eğ, kaydır, sıfırla) ve aynı işlerin klavye kısayolları.
// Fareyle de yapılabiliyor (tekerlek = yakınlaş, sürükle = kaydır, Shift/sağ tuşla sürükle = döndür) ama öğrenciler
// bunu fark etmiyordu. Düğmeye basılı tutunca hareket sürer. Yazı kutusundayken klavye kısayolları çalışmaz.
import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useProgramState } from '../Sidebar';
import { IProgramState } from '../Program';
import { KeyboardOrder, useGlobalKeyboard } from '@/src/utils/keyboard';
import { clamp } from '@/src/utils/data';
import { Vec3 } from '@/src/utils/vector';
import s from './KameraKontrol.module.scss';

type Islem = 'yakin' | 'uzak' | 'solaDon' | 'sagaDon' | 'yukariEg' | 'asagiEg' | 'solaKay' | 'sagaKay' | 'yukariKay' | 'asagiKay';

const YAKINLIK = 0.85;   // her adımda uzaklık çarpanı
const DONUS = 6;         // derece
const EGIM = 4;          // derece
const KAYMA = 30;        // piksel karşılığı (fareyle sürüklemedeki ölçek)

function uygula(ps: IProgramState, islem: Islem) {
    let a = ps.camera.angle.clone();
    let c = ps.camera.center.clone();
    let kay = (dx: number, dy: number) => {
        // CanvasEventSurface.pan ile aynı ölçek
        c.z = c.z + dy * 0.1 * a.z;
        let yon = Math.sin(a.x * Math.PI / 180) > 0 ? 1 : -1;
        c.x = c.x + yon * dx * 0.1 * a.z;
    };
    switch (islem) {
        case 'yakin': a.z = clamp(a.z * YAKINLIK, 0.1, 100000); break;
        case 'uzak': a.z = clamp(a.z / YAKINLIK, 0.1, 100000); break;
        case 'solaDon': a.x += DONUS; break;
        case 'sagaDon': a.x -= DONUS; break;
        case 'yukariEg': a.y = clamp(a.y + EGIM, -87, 87); break;
        case 'asagiEg': a.y = clamp(a.y - EGIM, -87, 87); break;
        case 'solaKay': kay(KAYMA, 0); break;
        case 'sagaKay': kay(-KAYMA, 0); break;
        case 'yukariKay': kay(0, KAYMA); break;
        case 'asagiKay': kay(0, -KAYMA); break;
    }
    ps.camera.desiredCameraTransition = undefined; // süren bir kamera geçişini kes
    ps.camera.angle = a;
    ps.camera.center = c;
    ps.markDirty();
}

// Bölümün açılış görünümüne (yoksa genel görünüme) dön
function sifirla(ps: IProgramState) {
    let hedef = ps.walkthrough.cameraInitial ?? ps.mainExample.camera;
    if (!hedef) return;
    ps.camera.desiredCamera = { center: hedef.center.clone(), angle: new Vec3(hedef.angle.x, hedef.angle.y, hedef.angle.z) };
    ps.markDirty();
}

const TUSLAR: Record<string, Islem> = {
    '+': 'yakin', '=': 'yakin', 'PageUp': 'yakin',
    '-': 'uzak', '_': 'uzak', 'PageDown': 'uzak',
    'ArrowLeft': 'solaDon', 'ArrowRight': 'sagaDon', 'ArrowUp': 'yukariEg', 'ArrowDown': 'asagiEg',
    'a': 'solaKay', 'd': 'sagaKay', 'w': 'yukariKay', 's': 'asagiKay',
};

const Dugme: React.FC<{ ad: string; ipucu: string; islem?: Islem; tik?: () => void; ps: IProgramState; children: React.ReactNode }> = ({ ad, ipucu, islem, tik, ps, children }) => {
    let zaman = useRef<number | null>(null);
    let dur = () => { if (zaman.current !== null) { clearInterval(zaman.current); zaman.current = null; } };
    useEffect(() => dur, []);
    let basla = (e: React.PointerEvent) => {
        e.preventDefault();
        if (tik) { tik(); return; }
        if (!islem) return;
        uygula(ps, islem);
        dur();
        zaman.current = window.setInterval(() => uygula(ps, islem), 70);
    };
    return <button className={s.dugme} aria-label={ad} title={`${ad} (${ipucu})`}
        onPointerDown={basla} onPointerUp={dur} onPointerLeave={dur} onPointerCancel={dur}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tik ? tik() : islem && uygula(ps, islem); } }}>
        {children}
    </button>;
};

export const KameraKontrol: React.FC = () => {
    let ps = useProgramState();
    let [yardim, setYardim] = useState(false);

    useGlobalKeyboard(KeyboardOrder.Element, (ev: KeyboardEvent) => {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        let tus = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        if (tus === 'r' || tus === '0') { sifirla(ps); ev.preventDefault(); return; }
        if (tus === '?' || tus === 'h') { setYardim(y => !y); return; }
        let islem = TUSLAR[tus];
        if (islem) { uygula(ps, islem); ev.preventDefault(); }
    });

    return <div className={s.kutu}>
        <div className={s.izgara} role="toolbar" aria-label="Kamera">
            <Dugme ps={ps} ad="Yakınlaş" ipucu="+ ya da tekerlek" islem="yakin">
                <svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5 17 17M6 8.5h5M8.5 6v5" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Uzaklaş" ipucu="− ya da tekerlek" islem="uzak">
                <svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5 17 17M6 8.5h5" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Sola döndür" ipucu="←" islem="solaDon">
                <svg viewBox="0 0 20 20"><path d="M4.5 10a5.5 5.5 0 1 0 2-4.25" /><path d="M6 2.5v3.6h3.6" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Sağa döndür" ipucu="→" islem="sagaDon">
                <svg viewBox="0 0 20 20"><path d="M15.5 10a5.5 5.5 0 1 1-2-4.25" /><path d="M14 2.5v3.6h-3.6" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Yukarıdan bak" ipucu="↑" islem="yukariEg">
                <svg viewBox="0 0 20 20"><path d="M5 12.5 10 7.5l5 5" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Aşağıdan bak" ipucu="↓" islem="asagiEg">
                <svg viewBox="0 0 20 20"><path d="M5 7.5 10 12.5l5-5" /></svg>
            </Dugme>
            <Dugme ps={ps} ad="Görünümü sıfırla" ipucu="R" tik={() => sifirla(ps)}>
                <svg viewBox="0 0 20 20"><path d="M3.5 9.5 10 4l6.5 5.5M5.5 8v7.5h9V8" /></svg>
            </Dugme>
            <button className={clsx(s.dugme, yardim && s.secili)} aria-label="Klavye kısayolları" title="Klavye kısayolları (?)"
                onClick={() => setYardim(y => !y)}>
                <svg viewBox="0 0 20 20"><rect x="2.5" y="5.5" width="15" height="9" rx="1.5" /><path d="M5.5 8.5h1M8.5 8.5h1M11.5 8.5h1M14 8.5h.5M6.5 11.5h7" /></svg>
            </button>
        </div>
        {yardim && <div className={s.yardim}>
            <div className={s.yardimBaslik}>Klavye</div>
            <dl>
                <dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>yakınlaş / uzaklaş</dd>
                <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>döndür</dd>
                <dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>yukarıdan / aşağıdan bak</dd>
                <dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>kaydır</dd>
                <dt><kbd>R</kbd></dt><dd>görünümü sıfırla</dd>
                <dt><kbd>Boşluk</kbd></dt><dd>anlatımda devam</dd>
            </dl>
            <div className={s.yardimBaslik}>Fare</div>
            <dl>
                <dt>tekerlek</dt><dd>yakınlaş / uzaklaş</dd>
                <dt>sürükle</dt><dd>kaydır</dd>
                <dt>Shift + sürükle</dt><dd>döndür</dd>
            </dl>
        </div>}
    </div>;
};
