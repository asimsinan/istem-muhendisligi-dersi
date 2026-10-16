// TR: Ders sitesi başlığı (2B / 3B geçişi, Anlatım / Ayrıntılı, TR / EN)
import React from 'react';
import s from './Ust.module.scss';
import { yol } from './yol';
import { EN, L, KARSI_TABAN, ADRES_2B } from './dil';

// TR: gorunum: anlatim (/), ayrinti (/ayrintili/: matris işlemleri), kesif (/kesif/: serbest gezinme)
type Gorunum = 'anlatim' | 'ayrinti' | 'kesif';
const SECENEKLER: { id: Gorunum; ad: string; adres: string; ipucu: string }[] = [
    { id: 'anlatim', ad: L('Anlatım', 'Story'), adres: '/', ipucu: L('Adım adım sinematik anlatım', 'Step-by-step cinematic story') },
    { id: 'ayrinti', ad: L('Ayrıntılı', 'Detailed'), adres: '/ayrintili/', ipucu: L('Bir bloğun içindeki matris işlemleri, gerçek sayılarla', 'The matrix operations inside a block, with real numbers') },
    { id: 'kesif', ad: L('Keşif', 'Explore'), adres: '/kesif/', ipucu: L('Serbest gezinme: parçaya ya da bloğa tıklayın', 'Free exploration: click a token or a block') },
];

export const Ust: React.FC<{ children?: React.ReactNode; gorunum?: Gorunum }> = ({ children, gorunum = 'anlatim' }) => {
    let karsi = KARSI_TABAN + (gorunum === 'ayrinti' ? '/ayrintili/' : gorunum === 'kesif' ? '/kesif/' : '/');
    return <header className={s.ust}>
        <div className={s.sol}>
            <a className={s.logo} href={ADRES_2B} title={L('Transformer Gezgini · Türkçe GPT-2', 'Transformer Explorer · GPT-2')}>
                {EN ? <>T<span className={s.kucuk}>RANSFORMER</span> E<span className={s.kucuk}>XPLORER</span></>
                    : <>T<span className={s.kucuk}>RANSFORMER</span> G<span className={s.kucuk}>EZGİNİ</span></>}
            </a>
            <nav className={s.dil} aria-label={L('Dil', 'Language')}>
                {EN ? <a href={karsi} className={s.dilSecenek} hrefLang="tr" title="Türkçe sürüm (Türkçe GPT-2)">TR</a>
                    : <span className={`${s.dilSecenek} ${s.dilSecili}`} aria-current="true">TR</span>}
                {EN ? <span className={`${s.dilSecenek} ${s.dilSecili}`} aria-current="true">EN</span>
                    : <a href={karsi} className={s.dilSecenek} hrefLang="en" title="English version (OpenAI GPT-2)">EN</a>}
            </nav>
            <nav className={s.anahtar} aria-label={L('Görünüm', 'View')}>
                <a href={ADRES_2B} className={s.secenek}>{L('2B', '2D')}</a>
                <span className={`${s.secenek} ${s.secili}`} aria-current="page">{L('3B', '3D')}</span>
            </nav>
            <nav className={s.anahtar} aria-label={L('3B görünüm', '3D view')}>
                {SECENEKLER.map(o => o.id === gorunum
                    ? <span key={o.id} className={`${s.secenek} ${s.secili2}`} aria-current="page">{o.ad}</span>
                    : <a key={o.id} href={yol(o.adres)} className={s.secenek} title={o.ipucu}>{o.ad}</a>)}
            </nav>
        </div>
        <div className={s.sag}>
            {children}
            <a className={s.baglanti} href="/" title={L('İstem Mühendisliği ders sitesi', 'Prompt Engineering course site (Turkish)')}>{L('Ders sitesi', 'Course site')}</a>
        </div>
    </header>;
};
