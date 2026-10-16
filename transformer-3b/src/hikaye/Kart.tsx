'use client';
// TR: Adım başında açılan kitap biçimli bilgi kartı (sol sayfa: ASY anlatıyor; sağ sayfa: oyuncak örnek + ekranda ne var)
// ve altyazıdaki terimlerin üstüne gelince açılan sözlük kutucukları.
import React from 'react';
import { IKart, SOZLUK, terimAdi, terimleriIsaretle } from './kartlar';
import s from './hikaye.module.scss';
import { L } from '../llm/tr/dil';

// Rehber robot ASY (bileşen adı Gezgin): bu proje için çizilmiş özgün karakter. Gövdesindeki yeşil/pembe hücreler sahnedeki vektörlerin renkleri,
// anteninin kırmızı ucu "izlenen parça" rengi.
export const Gezgin: React.FC<{ boyut?: number }> = ({ boyut = 120 }) =>
    <svg className={s.gezgin} width={boyut} height={boyut * 1.2} viewBox="0 0 120 144" aria-hidden="true">
        <line x1="60" y1="10" x2="60" y2="26" stroke="#9aa6d6" strokeWidth="3" strokeLinecap="round" />
        <circle className={s.gezginAnten} cx="60" cy="9" r="5.5" fill="#ff3b5c" />
        <rect x="22" y="26" width="76" height="52" rx="18" fill="#2a3577" stroke="#6c8cff" strokeWidth="2.5" />
        <rect x="31" y="35" width="58" height="34" rx="12" fill="#0b1024" />
        <g className={s.gezginGoz}>
            <ellipse cx="47" cy="51" rx="6" ry="7" fill="#33e0b0" />
            <ellipse cx="73" cy="51" rx="6" ry="7" fill="#33e0b0" />
        </g>
        <path d="M52 62q8 5 16 0" stroke="#33e0b0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="14" y="44" width="8" height="16" rx="4" fill="#6c8cff" />
        <rect x="98" y="44" width="8" height="16" rx="4" fill="#6c8cff" />
        <rect x="52" y="78" width="16" height="7" fill="#4a5694" />
        <rect x="30" y="84" width="60" height="40" rx="12" fill="#2a3577" stroke="#6c8cff" strokeWidth="2.5" />
        {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => <rect key={`${r}${c}`} x={40 + c * 10.5} y={92 + r * 9} width="8" height="6.5" rx="1.5"
            fill={(r * 4 + c) % 3 === 1 ? '#ff5c8a' : '#33e0b0'} opacity={0.55 + ((r * 7 + c * 3) % 5) * 0.09} />))}
        <path className={s.gezginKol} d="M30 94q-14 6-16 22" stroke="#6c8cff" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M90 94q14 6 16 22" stroke="#6c8cff" strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="38" y="124" width="14" height="14" rx="5" fill="#4a5694" />
        <rect x="68" y="124" width="14" height="14" rx="5" fill="#4a5694" />
    </svg>;

export const Kart: React.FC<{
    kart: IKart; no: number; toplam: number; kapat: () => void; kartlarAcik: boolean; setKartlarAcik: (a: boolean) => void;
}> = ({ kart, no, toplam, kapat, kartlarAcik, setKartlarAcik }) => {
    let baslatRef = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => { baslatRef.current?.focus({ preventScroll: true }); }, [no]);
    return <div className={s.kartPerde} onClick={e => { if (e.target === e.currentTarget) kapat(); }}>
        <section className={s.kitap} role="dialog" aria-modal="true" aria-labelledby="kart-baslik" key={no}>
            <div className={s.sayfaSol}>
                <div className={s.kartUst}><span className={s.kartNo}>{no + 1}/{toplam}</span><h2 id="kart-baslik">{kart.baslik}</h2></div>
                <div className={s.anlatici}>
                    <div className={s.gezginKutu}><Gezgin /><span className={s.gezginAd}>ASY</span></div>
                    <p className={s.balon}>{kart.hikaye}</p>
                </div>
            </div>
            <div className={s.sirt} aria-hidden="true" />
            <div className={s.sayfaSag}>
                <div className={s.ornekBaslik}>{kart.ornekBaslik}</div>
                {kart.ornek.length > 0 && <pre className={s.ornek}>{kart.ornek.join('\n')}</pre>}
                {kart.ornekNot && <p className={s.ornekNot}>{kart.ornekNot}</p>}
                <div className={s.ornekBaslik}>{L('Ekranda', 'On screen')}</div>
                <p className={s.ekranda}>{kart.ekranda}</p>
                <div className={s.ornekBaslik}>{L('Terimler', 'Terms')}</div>
                <dl className={s.terimler}>
                    {kart.terimler.map(k => <div key={k}><dt>{terimAdi(k)}</dt><dd>{SOZLUK[k]}</dd></div>)}
                </dl>
                <div className={s.kartAlt}>
                    <label className={s.kartSecenek}>
                        <input type="checkbox" checked={!kartlarAcik} onChange={e => setKartlarAcik(!e.target.checked)} /> {L('Kartları gösterme', "Don't show cards")}
                    </label>
                    <button ref={baslatRef} className={s.dugme} onClick={kapat}>{L('Animasyonu başlat ▶', 'Start animation ▶')}</button>
                </div>
            </div>
        </section>
    </div>;
};

// Altyazı: sözlükteki terimlerin altı noktalı çizilir; üstüne gelince (ya da sekmeyle odaklanınca) açıklama açılır
export const TerimliMetin: React.FC<{ metin: string }> = ({ metin }) => <>
    {terimleriIsaretle(metin).map((p, i) => typeof p === 'string' ? <React.Fragment key={i}>{p}</React.Fragment>
        : <span key={i} className={s.terim} tabIndex={0}>{p.terim}<span className={s.terimKutu} role="tooltip"><b>{terimAdi(p.anahtar)}</b> {SOZLUK[p.anahtar]}</span></span>)}
</>;
