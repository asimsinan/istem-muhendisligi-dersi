'use client';
// TR: Keşif modu: serbest gezinme ve mimari yolculuğu. Seçili parça 19 adımdan geçer (giriş, açılan bloğun 12 adımı,
// çıkış); sahne, sağdaki kart, alttaki şerit ve tablo aynı seçimi izler. Adaylardan biri seçilince cümleye eklenir ve
// model yeniden çalışır. Bütün sayılar tarayıcıda çalışan modelin gerçek çıktısı.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import type { CameraControls } from '@react-three/drei';
import { ITurkceModel, ISonuc, ileri, turkceModelYukle } from '@/src/llm/tr/TurkceModel';
import { ORNEK_CUMLE } from '@/src/llm/tr/ayarlar';
import { L, MODEL_ADI } from '@/src/llm/tr/dil';
import { hikayeVerisi, yuzde } from '@/src/hikaye/veri';
import { adaylar as adaylarHesapla, basOzetleri, dikkatSatiri, mercek, ornekle, IMercek } from './veri';
import { ASAMALAR, ADIM_SAYISI, ILK_BLOK_ADIMI, SON_BLOK_ADIMI, blokAdimiMi, oynatmaSirasi } from './asamalar';
import { AsamaKart, gor } from './AsamaKart';
import { yakinlas, dondur } from './Sahne';
import s from './kesif.module.scss';

const KesifSahne = React.memo(dynamic(() => import('./Sahne').then(m => m.KesifSahne), { ssr: false }));
const EN_FAZLA = 12;      // yazılan cümle en çok bu kadar parça
const URETIM_SINIRI = 20; // adaylardan ekleyerek ulaşılabilecek en uzun dizi
interface IPaneller { ozet: boolean; kart: boolean; yol: boolean; tablo: boolean }
const PANEL_VARSAYILAN: IPaneller = { ozet: true, kart: true, yol: true, tablo: false };
const PANEL_ANAHTAR = 'kesif-paneller';
const PANEL_ADLARI: [keyof IPaneller, string][] = [
    ['ozet', L('Özet', 'Summary')], ['kart', L('Adım kartı', 'Step card')], ['yol', L('Yolculuk', 'Journey')], ['tablo', L('Tablo', 'Table')],
];
const GRUPLAR = [
    { ad: L('Giriş', 'Input'), bas: 0, son: ILK_BLOK_ADIMI - 1 },
    { ad: '', bas: ILK_BLOK_ADIMI, son: SON_BLOK_ADIMI },
    { ad: L('Çıkış', 'Output'), bas: SON_BLOK_ADIMI + 1, son: ADIM_SAYISI - 1 },
];

export const KesifSayfa: React.FC = () => {
    let kontrol = useRef<CameraControls | null>(null);
    let [model, setModel] = useState<ITurkceModel | null>(null);
    let [ilerleme, setIlerleme] = useState(0);
    let [hata, setHata] = useState<string | null>(null);
    let [izin, setIzin] = useState<boolean | null>(null);
    let [metin, setMetin] = useState(ORNEK_CUMLE);
    let [sonuc, setSonuc] = useState<ISonuc | null>(null);
    let [tokenler, setTokenler] = useState<string[]>([]);
    let [secili, setSecili] = useState(0);
    let [blok, setBlok] = useState(0);
    let [bas, setBas] = useState(0);
    let [adim, setAdim] = useState(0);          // açılışta yolculuğun ilk adımı
    let [genel, setGenel] = useState(true);     // genel görünüm: bütün model ekrana sığar; seçim yapılınca kamera odaklanır
    let [genelNo, setGenelNo] = useState(0);
    let odakla = () => setGenel(false);
    let [sicaklik, setSicaklik] = useState(1);
    let [sekme, setSekme] = useState<'parcalar' | 'baslar' | 'adaylar'>('baslar');
    let [oynuyor, setOynuyor] = useState(false);
    let [mercekler, setMercekler] = useState<Record<number, IMercek[]>>({});
    let [gecmis, setGecmis] = useState<number[][]>([]);  // geri al için önceki diziler
    // paneller gizlenebilir; tercih bu tarayıcıda hatırlanır
    let [pnl, setPnl] = useState<IPaneller>(PANEL_VARSAYILAN);
    useEffect(() => {
        let kayit: Partial<IPaneller> | null = null;
        try { kayit = JSON.parse(localStorage.getItem(PANEL_ANAHTAR) ?? 'null'); } catch { }
        let alcak = window.innerHeight < 860;
        setPnl({ ...PANEL_VARSAYILAN, ozet: !alcak, ...(kayit ?? {}) });
    }, []);
    let panel = useCallback((k: keyof IPaneller, v?: boolean) => setPnl(o => {
        let y = { ...o, [k]: v ?? !o[k] };
        try { localStorage.setItem(PANEL_ANAHTAR, JSON.stringify(y)); } catch { }
        return y;
    }), []);
    let hepsiKapali = !pnl.ozet && !pnl.kart && !pnl.yol && !pnl.tablo;
    let sonAcik = useRef<IPaneller>(PANEL_VARSAYILAN);
    let hepsi = useCallback(() => setPnl(o => {
        let y: IPaneller;
        if (o.ozet || o.kart || o.yol || o.tablo) { sonAcik.current = o; y = { ozet: false, kart: false, yol: false, tablo: false }; }
        else y = sonAcik.current;
        try { localStorage.setItem(PANEL_ANAHTAR, JSON.stringify(y)); } catch { }
        return y;
    }), []);
    let hepsiRef = useRef(hepsi); hepsiRef.current = hepsi;

    useEffect(() => { setIzin(!window.matchMedia('(max-width: 640px), (pointer: coarse)').matches); }, []);
    useEffect(() => {
        if (!izin) return;
        let iptal = false;
        turkceModelYukle(o => !iptal && setIlerleme(o)).then(m => !iptal && setModel(m)).catch(e => !iptal && setHata(String(e?.message ?? e)));
        return () => { iptal = true; };
    }, [izin]);

    /** dizi modelden geçirilir; blok/baş ilk çalıştırmada hikâyenin örneğine, eklemede olduğu yerde kalır */
    let calistirIds = useCallback((ids: number[], m: ITurkceModel, ilk: boolean) => {
        let sn = ileri(m, ids, ids.length);
        setSonuc(sn);
        setTokenler(ids.map(id => m.tok.coz([id])));
        setSecili(sn.n - 1);
        if (ilk) {
            let v = hikayeVerisi(m, sn);
            setBlok(v.varsayilanDikkat.katman);
            setBas(v.varsayilanDikkat.bas);
        }
        setMercekler({});
        setOynuyor(false);
        setMetin(m.tok.coz(ids));
    }, []);
    let calistir = useCallback((yeni: string, m = model) => {
        if (!m) return;
        let ids = m.tok.kodla(yeni).map(p => p.id).slice(0, EN_FAZLA);
        if (!ids.length) return;
        setGecmis([]);
        setGenel(true);
        calistirIds(ids, m, true);
    }, [model, calistirIds]);
    /** seçili konumdan sonra adayı ekle; seçili parça son değilse sonrası atılır (başka bir yoldan devam) */
    let ekle = useCallback((id: number) => {
        if (!model || !sonuc) return;
        let onceki = Array.from(sonuc.ids), ids = [...onceki.slice(0, secili + 1), id];
        if (ids.length > URETIM_SINIRI) return;
        setGecmis(g => [...g, onceki]);
        calistirIds(ids, model, false);
    }, [model, sonuc, secili, calistirIds]);
    let geriAl = useCallback(() => {
        if (!model || !gecmis.length) return;
        calistirIds(gecmis[gecmis.length - 1], model, false);
        setGecmis(g => g.slice(0, -1));
    }, [model, gecmis, calistirIds]);
    let ornekleEkle = useCallback(() => { if (model && sonuc) ekle(ornekle(model, sonuc, secili, sicaklik)); }, [model, sonuc, secili, sicaklik, ekle]);

    useEffect(() => { if (model) calistir(metin, model); }, [model]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { (window as any).__kesif = { kontrol, setSecili, setBlok, setBas, setAdim }; }, []);

    // seçili parçanın logit merceği (≈1 sn) arkadan hesaplanır
    useEffect(() => {
        if (!model || !sonuc || mercekler[secili]) return;
        let m = model, sn = sonuc, i = secili;
        let z = setTimeout(() => setMercekler(o => ({ ...o, [i]: mercek(m, sn, i) })), 250);
        return () => clearTimeout(z);
    }, [model, sonuc, secili, mercekler]);

    let H = model?.config.n_head ?? 12, nL = model?.config.n_layer ?? 12, n = tokenler.length;
    let sira = useMemo(() => oynatmaSirasi(nL), [nL]);

    // oynat: giriş → Blok 1'in içi → kalan bloklar hızlı → çıkış
    useEffect(() => {
        if (!oynuyor) return;
        let k = sira.findIndex(o => o.adim === adim && o.blok === blok);
        let sonraki = k < 0 ? undefined : sira[k + 1];
        if (!sonraki) { setOynuyor(false); return; }
        let { adim: a2, blok: b2, hizli } = sonraki;
        let z = setTimeout(() => { setAdim(a2); setBlok(b2); }, hizli ? 650 : 1500);
        return () => clearTimeout(z);
    }, [oynuyor, adim, blok, sira]);
    let oynat = () => {
        odakla();
        if (oynuyor) { setOynuyor(false); return; }
        if (!sira.some(o => o.adim === adim && o.blok === blok) || adim === ADIM_SAYISI - 1) { setAdim(0); setBlok(0); }
        setOynuyor(true);
    };
    let git = (a: number) => { odakla(); setOynuyor(false); setAdim(Math.max(0, Math.min(ADIM_SAYISI - 1, a))); };

    let dikkat = useMemo(() => sonuc ? dikkatSatiri(sonuc, blok, bas, secili) : [], [sonuc, blok, bas, secili]);
    let ozet = useMemo(() => sonuc ? basOzetleri(sonuc, blok, secili, H) : [], [sonuc, blok, secili, H]);
    let tumBaslar = useMemo(() => sonuc ? Array.from({ length: H }, (_, h) => dikkatSatiri(sonuc!, blok, h, secili)) : [], [sonuc, blok, secili, H]);
    let ady = useMemo(() => model && sonuc ? adaylarHesapla(model, sonuc, secili, 6) : [], [model, sonuc, secili]);
    let enCok = useMemo(() => {
        let en = -1;
        dikkat.forEach((p, j) => { if (j !== secili && (en < 0 || p > dikkat[en])) en = j; });
        return en;
    }, [dikkat, secili]);
    let ekleRef = useRef<() => void>(() => { });
    let geriAlRef = useRef(geriAl);
    geriAlRef.current = geriAl;
    ekleRef.current = () => { if (ady[0]) ekle(ady[0].id); };
    let mrc = mercekler[secili];
    let sonParca = secili === n - 1;
    let sinirda = secili + 2 > URETIM_SINIRI;

    // klavye: ← → adım, Shift + ← → parça, ↑ ↓ blok, Enter ekle, ⌫ geri al
    useEffect(() => {
        let f = (e: KeyboardEvent) => {
            let h = e.target as HTMLElement;
            if (h && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(h.tagName)) return;
            if (/^Arrow/.test(e.key)) setGenel(false);
            if (e.key === 'ArrowLeft' && e.shiftKey) setSecili(i => Math.max(0, i - 1));
            else if (e.key === 'ArrowRight' && e.shiftKey) setSecili(i => Math.min(n - 1, i + 1));
            else if (e.key === 'ArrowLeft') { setOynuyor(false); setAdim(a => Math.max(0, a - 1)); }
            else if (e.key === 'ArrowRight') { setOynuyor(false); setAdim(a => Math.min(ADIM_SAYISI - 1, a + 1)); }
            else if (e.key === 'ArrowUp') setBlok(b => Math.min(nL - 1, b + 1));
            else if (e.key === 'ArrowDown') setBlok(b => Math.max(0, b - 1));
            else if (e.key === 'Enter') ekleRef.current();
            else if (e.key === 'Backspace') geriAlRef.current();
            else if (e.key === 'h' || e.key === 'H') hepsiRef.current();
            else return;
            e.preventDefault();
        };
        window.addEventListener('keydown', f);
        return () => window.removeEventListener('keydown', f);
    }, [n, nL]);

    if (izin === false && !model) return <main className={s.sayfa}><div className={s.yukleme}>
        <h2>{L('Bu görünüm bilgisayar için tasarlandı', 'This view is designed for computers')}</h2>
        <p>{L('Model yaklaşık 125 MB indirir; telefonda yavaş çalışabilir.', 'The model downloads about 125 MB; it may be slow on a phone.')}</p>
        <button className={s.dugmeAna} onClick={() => setIzin(true)}>{L('Yine de indir', 'Download anyway')}</button>
    </div></main>;

    if (!model || !sonuc || !n) return <main className={s.sayfa}><div className={s.yukleme}>
        {hata ? <><h2>{L('Model inmedi', 'Model failed to load')}</h2><p>{hata}</p></> : <>
            <h2>{L('Model iniyor…', 'Loading the model…')}</h2>
            <div className={s.yuklemeCubuk}><i style={{ width: `${Math.round(ilerleme * 100)}%` }} /></div>
            <p>{MODEL_ADI} · {Math.round(ilerleme * 100)}%</p>
        </>}
    </div></main>;

    let parcaAdi = gor(tokenler[secili]);
    let asama = ASAMALAR[adim];
    let grupAdi = asama.grup === 'giris' ? L('GİRİŞ', 'INPUT') : asama.grup === 'cikis' ? L('ÇIKIŞ', 'OUTPUT') : L(`BLOK ${blok + 1} / ${nL}`, `BLOCK ${blok + 1} / ${nL}`);

    let sagDolu = pnl.kart || pnl.tablo;
    let yerlesim = {
        '--sag': sagDolu ? '376px' : '0px',
        '--altSag': pnl.tablo ? '316px' : '0px',
    } as React.CSSProperties;
    let bosluk = { sag: sagDolu ? 376 : 0, alt: pnl.yol ? 150 : 0, ust: 70 };
    let kapat = (k: keyof IPaneller) => <button className={s.kapat} onClick={() => panel(k, false)} title={L('Gizle', 'Hide')} aria-label={L('Gizle', 'Hide')}>×</button>;

    return <main className={s.sayfa} style={yerlesim}>
        <div className={s.sahne}>
            <KesifSahne tokenler={tokenler} ids={sonuc.ids} L={nL} V={model.config.vocab_size} secili={secili} blok={blok} adim={adim} dikkat={dikkat} tumBaslar={tumBaslar} bas={bas} onBas={setBas} adaylar={ady}
                onParca={i => { odakla(); setSecili(i); }} onBlok={l => { odakla(); setBlok(l); setOynuyor(false); if (!blokAdimiMi(adim)) setAdim(ILK_BLOK_ADIMI); }} onAdim={git} kontrol={kontrol} bosluk={bosluk} genel={genel} genelNo={genelNo} />
        </div>

        {/* üst araç çubuğu */}
        <div className={clsx(s.kart, s.arac)}>
            <form className={s.cumle} onSubmit={e => { e.preventDefault(); calistir(metin); }}>
                <span className={s.etiketKucuk}>{L('Cümle', 'Sentence')}</span>
                <input value={metin} onChange={e => setMetin(e.target.value)} spellCheck={false} aria-label={L('Cümle', 'Sentence')} />
                <button className={s.dugmeAna} type="submit">{L('Çalıştır', 'Run')}</button>
            </form>
            <label className={s.secici}><span className={s.rozet}>B</span>
                <select value={blok} onChange={e => { odakla(); setBlok(+e.target.value); setOynuyor(false); }} aria-label={L('Blok', 'Block')}>
                    {Array.from({ length: nL }, (_, l) => <option key={l} value={l}>{L('Blok', 'Block')} {l + 1}</option>)}
                </select>
            </label>
            <label className={s.secici}><span className={s.rozet}>H</span>
                <select value={bas} onChange={e => setBas(+e.target.value)} aria-label={L('Baş', 'Head')}>
                    {Array.from({ length: H }, (_, h) => <option key={h} value={h}>{L('Baş', 'Head')} {h + 1}</option>)}
                </select>
            </label>
            <div className={s.panelDugmeleri} role="group" aria-label={L('Paneller', 'Panels')}>
                <button className={clsx(s.goz, hepsiKapali && s.gozKapali)} onClick={hepsi} title={L('Bütün panelleri gizle / göster (H)', 'Hide / show all panels (H)')}>
                    {hepsiKapali ? L('◉ Panelleri göster', '◉ Show panels') : L('◎ Tümünü gizle', '◎ Hide all')}</button>
                {PANEL_ADLARI.map(([k, ad]) => <button key={k} aria-pressed={pnl[k]} onClick={() => panel(k)}>{ad}</button>)}
            </div>
            <span className={s.ipucuKucuk}>{L('← → adım · Shift ← → parça · ↑ ↓ blok · Enter ekle · H paneller', '← → step · Shift ← → token · ↑ ↓ block · Enter add · H panels')}</span>
        </div>

        {/* özet kartları */}
        {pnl.ozet && <div className={s.kpi}>
            <div className={s.kart}>
                {kapat('ozet')}
                <small>{L(`"${parcaAdi}" sonrası en olası`, `Most likely after "${parcaAdi}"`)}</small>
                <b>{ady[0] ? gor(ady[0].metin) : '…'}</b> <span className={clsx(s.hap, s.yesil)}>{ady[0] ? yuzde(ady[0].p, 0) : ''}</span>
                <small>{sonParca ? L('modelin tahmini', "the model's prediction") : L('bu konumdan sonraki tahmin', 'prediction at this position')}</small>
                <div className={s.uretDugmeler}>
                    <button className={s.dugmeAna} disabled={!ady[0] || sinirda} onClick={() => ady[0] && ekle(ady[0].id)}>
                        {sonParca ? L('＋ Ekle, devam et', '＋ Add & continue') : L('＋ Buradan dallan', '＋ Branch here')}</button>
                    <button className={s.dugmeIkinci} disabled={!gecmis.length} onClick={geriAl}>{L('↶ Geri al', '↶ Undo')}</button>
                </div>
            </div>
            {secili > 0 && enCok >= 0 && <div className={s.kart}>
                <small>{L(`"${parcaAdi}" en çok nereye bakıyor?`, `Where does "${parcaAdi}" look most?`)}</small>
                <b>{gor(tokenler[enCok])}</b> <span className={clsx(s.hap, s.turuncu)}>{yuzde(dikkat[enCok], 0)}</span>
                <small>{L(`Blok ${blok + 1} · Baş ${bas + 1}`, `Block ${blok + 1} · Head ${bas + 1}`)}</small>
            </div>}
        </div>}

        {/* kamera denetimi */}
        <div className={clsx(s.kart, s.kontrol)}>
            <button onClick={() => yakinlas(kontrol.current, 2)} title={L('Yakınlaş', 'Zoom in')}>＋</button>
            <button onClick={() => yakinlas(kontrol.current, -2)} title={L('Uzaklaş', 'Zoom out')}>－</button>
            <button onClick={() => dondur(kontrol.current, 0.35)} title={L('Sola döndür', 'Rotate left')}>↺</button>
            <button onClick={() => dondur(kontrol.current, -0.35)} title={L('Sağa döndür', 'Rotate right')}>↻</button>
            <button onClick={() => { setGenel(true); setGenelNo(k => k + 1); }} title={L('Bütün model (ekrana sığdır)', 'Whole model (fit to screen)')}>⌂</button>
        </div>

        {/* inceleme kartı: seçili adım */}
        {pnl.kart && <aside className={clsx(s.kart, s.ince)}>
            {kapat('kart')}
            <div className={s.etk}>{grupAdi} · {L('ADIM', 'STEP')} {adim + 1} / {ADIM_SAYISI}</div>
            <div className={s.bas}>
                <div className={s.ikon}>{parcaAdi.slice(0, 3)}</div>
                <div><h2>{asama.ad}</h2><p>"{parcaAdi}" · #{sonuc.ids[secili]} · {L(`${secili + 1}. sıra`, `position ${secili + 1}`)}</p></div>
            </div>
            <div className={s.cubuk}><i style={{ width: `${((adim + 1) / ADIM_SAYISI) * 100}%` }} /></div>
            <AsamaKart model={model} sonuc={sonuc} tokenler={tokenler} secili={secili} blok={blok} bas={bas} adim={adim}
                sicaklik={sicaklik} setSicaklik={setSicaklik} mrc={mrc} ekle={ekle} ornekleEkle={ornekleEkle} sinirda={sinirda} setBas={setBas} />
            <div className={s.ileriGeri}>
                <button className={s.dugmeIkinci} disabled={adim === 0} onClick={() => git(adim - 1)}>← {adim > 0 ? ASAMALAR[adim - 1].kisa : ''}</button>
                <button className={s.dugmeAna} disabled={adim === ADIM_SAYISI - 1} onClick={() => git(adim + 1)}>{adim < ADIM_SAYISI - 1 ? ASAMALAR[adim + 1].kisa : ''} →</button>
            </div>
        </aside>}

        {/* mimari yolculuğu şeridi */}
        {pnl.yol && <section className={clsx(s.kart, s.takip)}>
            {kapat('yol')}
            <h3>{L('Mimari yolculuğu', 'Architecture journey')} <small>"{parcaAdi}" · {L('19 adım, 12 blok', '19 steps, 12 blocks')}</small>
                <button className={s.oynat} onClick={oynat}>{oynuyor ? L('❚❚ Durdur', '❚❚ Pause') : L('▶ Baştan sona oynat', '▶ Play all the way')}</button></h3>
            <div className={s.gruplar}>
                {GRUPLAR.map((g, gi) => <div key={gi} className={clsx(s.grup, gi === 1 && s.grupBlok)} style={{ flex: g.son - g.bas + 1 }}>
                    <div className={s.grupAd}>{gi === 1 ? <>
                        <button onClick={() => { odakla(); setBlok(b => Math.max(0, b - 1)); }} disabled={blok === 0} aria-label={L('Önceki blok', 'Previous block')}>‹</button>
                        {L(`Blok ${blok + 1} / ${nL}`, `Block ${blok + 1} / ${nL}`)}
                        <button onClick={() => { odakla(); setBlok(b => Math.min(nL - 1, b + 1)); }} disabled={blok === nL - 1} aria-label={L('Sonraki blok', 'Next block')}>›</button>
                        <small>{L('her blokta aynı 12 adım', 'same 12 steps in every block')}</small>
                    </> : g.ad}</div>
                    <div className={s.adimlar}>
                        {Array.from({ length: g.son - g.bas + 1 }, (_, k) => {
                            let a = g.bas + k;
                            return <button key={a} className={clsx(s.adim, a >= adim && s.bekliyorCizgi)} onClick={() => git(a)}>
                                <span className={clsx(s.nokta, a === adim && s.aktif, a > adim && s.bos)}>{a + 1}</span>
                                <span className={s.adimAd}>{ASAMALAR[a].kisa}</span>
                            </button>;
                        })}
                    </div>
                </div>)}
            </div>
        </section>}

        {/* tablo */}
        {pnl.tablo && <section className={clsx(s.kart, s.tablo)}>
            {kapat('tablo')}
            <h3>{L(`Blok ${blok + 1}`, `Block ${blok + 1}`)} <small>{L('satıra tıkla: sahnede seçilir', 'click a row to select it')}</small></h3>
            <div className={s.sekme} role="tablist">
                <button role="tab" aria-selected={sekme === 'parcalar'} onClick={() => setSekme('parcalar')}>{L('Parçalar', 'Tokens')} {n}</button>
                <button role="tab" aria-selected={sekme === 'baslar'} onClick={() => setSekme('baslar')}>{L('Başlar', 'Heads')} {H}</button>
                <button role="tab" aria-selected={sekme === 'adaylar'} onClick={() => setSekme('adaylar')}>{L('Adaylar', 'Candidates')} {ady.length}</button>
            </div>
            <div className={s.tabloKap}>
                <table>
                    <tbody>
                        {sekme === 'baslar' && [...ozet].sort((a, b) => (a.bas === bas ? -1 : b.bas === bas ? 1 : b.pay - a.pay)).map(o => <tr key={o.bas} className={clsx(o.bas === bas && s.seciliSatir)} onClick={() => setBas(o.bas)}>
                            <td className={s.soluk}>{L('Baş', 'Head')} {o.bas + 1}</td>
                            <td>"{parcaAdi}" {L('en çok →', 'most →')}</td>
                            <td className={s.mono}>{gor(tokenler[o.hedef])}</td>
                            <td className={s.barTd}><i className={s.bar} style={{ width: `${o.pay * 100}%`, background: o.bas === bas ? '#EA580C' : '#FDBA74' }} /></td>
                            <td className={s.sag}>{yuzde(o.pay, 0)}</td>
                        </tr>)}
                        {sekme === 'parcalar' && tokenler.map((t, j) => <tr key={j} className={clsx(j === secili && s.seciliSatir)} onClick={() => { odakla(); setSecili(j); }}>
                            <td className={s.soluk}>{j + 1}</td>
                            <td className={s.mono}>{gor(t)}</td>
                            <td className={s.soluk}>#{sonuc!.ids[j]}</td>
                            <td className={s.barTd}>{j <= secili && <i className={s.bar} style={{ width: `${(dikkat[j] ?? 0) * 100}%` }} />}</td>
                            <td className={s.sag}>{j <= secili ? yuzde(dikkat[j], 0) : L('sonra gelir', 'comes later')}</td>
                        </tr>)}
                        {sekme === 'adaylar' && ady.map((a, k) => <tr key={a.id} onClick={() => ekle(a.id)} title={L('Tıkla: bu parçayı ekle ve modeli yeniden çalıştır', 'Click: add this token and rerun the model')}>
                            <td className={s.soluk}>{k + 1}</td>
                            <td className={s.mono}>{gor(a.metin)}</td>
                            <td className={s.soluk}>#{a.id}</td>
                            <td className={s.barTd}><i className={s.bar} style={{ width: `${(a.p / ady[0].p) * 100}%`, background: k === 0 ? '#E11D48' : '#AEB7F5' }} /></td>
                            <td className={s.sag}>{yuzde(a.p, 1)}</td>
                            <td className={s.ekleTd}>＋</td>
                        </tr>)}
                    </tbody>
                </table>
                {sekme === 'parcalar' && <p className={s.notKucuk}>{L(`Çubuk: "${parcaAdi}" bu parçaya ne kadar bakıyor (Blok ${blok + 1}, Baş ${bas + 1}). Sonraki parçalara bakamaz.`, `Bar: how much "${parcaAdi}" looks at each token (block ${blok + 1}, head ${bas + 1}). It cannot look at later tokens.`)}</p>}
                {sekme === 'adaylar' && <p className={s.notKucuk}>{sinirda ? L(`Sınır: en çok ${URETIM_SINIRI} parça. Geri alın ya da yeni cümle yazın.`, `Limit: at most ${URETIM_SINIRI} tokens. Undo or type a new sentence.`)
                    : sonParca ? L('Bir adaya tıklayın: cümleye eklenir, model yeniden çalışır, yeni adaylar gelir. Böyle tekrar tekrar ilerleyin. Model metni tam olarak böyle, parça parça üretir.', 'Click a candidate: it is added, the model reruns and new candidates appear. Repeat to keep going: this is exactly how the model generates text, one token at a time.')
                        : L(`"${parcaAdi}" ortada bir parça: bir aday seçerseniz cümle buradan itibaren o adayla devam eder (sonrası atılır).`, `"${parcaAdi}" is in the middle: picking a candidate continues the sentence from here with it (the rest is dropped).`)}</p>}
            </div>
        </section>}
    </main>;
};
