'use client';
// TR: Sinematik 3B anlatım sayfası: modeli yükler, cümleyi çalıştırır, sahneyi ve üstündeki kontrolleri kurar.
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import type { CameraControls } from '@react-three/drei';
import { ITurkceModel, ISonuc, ileri, turkceModelYukle } from '@/src/llm/tr/TurkceModel';
import { ORNEK_CUMLE } from '@/src/llm/tr/ayarlar';
import { ADIMLAR, Saat } from './akis';
import { AYRINTI_ADIMLARI } from '../ayrinti/akis';
import { ayrintiVerisi, sicaklikliOlasilik } from '../ayrinti/veri';
import { ipucu } from '../ayrinti/ipucu';
import { Mimari } from './Mimari';
import { L, YEREL } from '../llm/tr/dil';
import { Kart, TerimliMetin } from './Kart';
import { kartlar, ayrintiKartlari } from './kartlar';
import { ANLATIM_EK, AYRINTI_EK, DUZEYLER, Duzey } from './duzeyler';
import { anlatimSorulari, ayrintiSorulari, ISoru } from './sorular';
import { SoruPenceresi, SoruSonucu } from './Soru';
import { IHikayeVeri, hikayeVerisi, logitMercegi, okunur, yuzde } from './veri';
import s from './hikaye.module.scss';

// Canvas yalnızca tarayıcıda; saat her 90 ms'de sayfayı yeniler, sahne yeniden çizilmesin diye memo
const Sahne = React.memo(dynamic(() => import('./Sahne').then(m => m.Sahne), { ssr: false }));
const AyrintiSahne = React.memo(dynamic(() => import('../ayrinti/Sahne').then(m => m.AyrintiSahne), { ssr: false }));

const EN_FAZLA = 14; // sahnede okunur kalması için parça sınırı

function yaziAlaniMi(e: EventTarget | null) {
    let h = e as HTMLElement | null;
    return !!h && (h.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(h.tagName));
}

// TR: mod = 'anlatim' (sinematik anlatım) ya da 'ayrinti' (bloğun içindeki matris işlemleri)
export const HikayeSayfa: React.FC<{ mod?: 'anlatim' | 'ayrinti' }> = ({ mod = 'anlatim' }) => {
    let ayrinti = mod === 'ayrinti';
    let adimlar: { baslik: string; sure: number; vuruslar: (v: any, d: any) => { t: number; metin: string }[] }[] = ayrinti ? AYRINTI_ADIMLARI : ADIMLAR;
    let saat = useMemo(() => new Saat(adimlar), []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { (window as any).__hikaye = saat; (window as any).__kontrol = kontrol; }, [saat]); // test betikleri için
    let d = useSyncExternalStore(saat.abone, saat.oku, saat.oku);
    let ipucuDeger = useSyncExternalStore(ipucu.abone, ipucu.oku, () => null);
    let kontrol = useRef<CameraControls | null>(null);

    let [model, setModel] = useState<ITurkceModel | null>(null);
    let [ilerleme, setIlerleme] = useState(0);
    let [hata, setHata] = useState<string | null>(null);
    let [izin, setIzin] = useState<boolean | null>(null);
    let [veri, setVeri] = useState<IHikayeVeri | null>(null);
    let [metin, setMetin] = useState(ORNEK_CUMLE);
    let [calisiyor, setCalisiyor] = useState(false);
    let [panelAcik, setPanelAcik] = useState(true);
    let [mimariAcik, setMimariAcik] = useState(true);
    let [tamEkran, setTamEkran] = useState(false);
    // bilgi kartları (iki görünümde de): her adımın kartı oturumda bir kez kendiliğinden açılır; kitap düğmesi ya da K ile yeniden açılır
    let [kartlarAcik, setKartlarAcikHam] = useState(true);
    let [kart, setKart] = useState<number | null>(null);
    let kartRef = useRef<number | null>(null); kartRef.current = kart;
    let gorulen = useRef(new Set<number>());
    useEffect(() => { try { if (localStorage.getItem('gezgin-kartlar') === '0') setKartlarAcikHam(false); } catch { } }, []);
    let setKartlarAcik = useCallback((a: boolean) => { setKartlarAcikHam(a); try { localStorage.setItem('gezgin-kartlar', a ? '1' : '0'); } catch { } }, []);
    let alanRef = useRef<HTMLElement>(null);
    // tam ekran: sahne + arayüz birlikte (başlık çubuğu dışarıda kalır); Safari için webkit önekli API
    let tamEkranDegistir = useCallback(() => {
        let el = alanRef.current as any, doc = document as any;
        if (!el) return;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
        else (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }, []);
    useEffect(() => {
        let f = () => setTamEkran(!!((document as any).fullscreenElement || (document as any).webkitFullscreenElement));
        document.addEventListener('fullscreenchange', f); document.addEventListener('webkitfullscreenchange', f);
        return () => { document.removeEventListener('fullscreenchange', f); document.removeEventListener('webkitfullscreenchange', f); };
    }, []);
    useEffect(() => { if (window.innerWidth < 1000) setMimariAcik(false); }, []);
    let sonucRef = useRef<ISonuc | null>(null);
    // 3B sahne (WebGL, gölgelendiriciler) ilk karesini çizene kadar kısa bir not göster; yavaş bilgisayarda boş ekran kalmasın
    let [sahneHazir, setSahneHazir] = useState(false);
    useEffect(() => {
        if (sahneHazir) return;
        let z = setInterval(() => { if (kontrol.current) { setSahneHazir(true); clearInterval(z); } }, 250);
        return () => clearInterval(z);
    }, [sahneHazir]);
    // sahnenin merkezi panellerin örtmediği alana kaysın (px): sağ panel açıkken ~20rem, alt altyazı ~9rem, üst adım çubuğu ~3rem
    // mimari haritasının genişliği CSS'teki clamp(16rem, 22vw, 20rem) ile aynı hesaplanır
    let [ekranG, setEkranG] = useState(1440);
    useEffect(() => {
        let f = () => setEkranG(window.innerWidth);
        f(); window.addEventListener('resize', f);
        return () => window.removeEventListener('resize', f);
    }, []);
    let bosluk = useMemo(() => {
        let sol = mimariAcik ? Math.min(320, Math.max(256, ekranG * 0.22)) + 22 : 0, sag = panelAcik ? 300 : 60;
        return ayrinti ? { sag, sol, alt: 175, ust: 120 } : { sag, sol, alt: 150 - 50 };
    }, [panelAcik, ayrinti, mimariAcik, ekranG]);

    // telefonda 125 MB indirmeden önce sor
    useEffect(() => {
        let telefon = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;
        setIzin(!telefon);
    }, []);

    useEffect(() => {
        if (!izin) return;
        let iptal = false;
        turkceModelYukle(o => !iptal && setIlerleme(o))
            .then(m => !iptal && setModel(m))
            .catch(e => !iptal && setHata(String(e?.message ?? e)));
        return () => { iptal = true; };
    }, [izin]);

    let calistir = useCallback((yeni: string, m = model) => {
        if (!m) return;
        let ids = m.tok.kodla(yeni).map(p => p.id).slice(0, EN_FAZLA);
        if (!ids.length) return;
        setCalisiyor(true);
        setTimeout(() => {
            let sn = ileri(m, ids, ids.length);
            sonucRef.current = sn;
            let v = hikayeVerisi(m, sn);
            setVeri(v);
            saat.ayarla({ dikkat: v.varsayilanDikkat });
            saat.adimaGit(0);
            setCalisiyor(false);
            // logit merceği (12 blok × 50.257) ~1 sn: sahne başladıktan sonra arkadan
            setTimeout(() => {
                if (sonucRef.current !== sn) return;
                let mercek = logitMercegi(m, sn);
                setVeri(onceki => onceki && sonucRef.current === sn ? { ...onceki, mercek } : onceki);
            }, 400);
        }, 40);
    }, [model, saat]);

    useEffect(() => { if (model) calistir(metin, model); }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

    // ayrıntılı görünümün matrisleri seçili blok/başa göre (ileri geçiş sonucundan) çıkarılır
    let ayVeri = useMemo(() => ayrinti && model && veri && sonucRef.current ? ayrintiVerisi(model, sonucRef.current, d.dikkat.katman, d.dikkat.bas) : null,
        [ayrinti, model, veri?.ids.join(','), d.dikkat.katman, d.dikkat.bas]); // eslint-disable-line react-hooks/exhaustive-deps

    // anlatım düzeyi: Hikaye / Öğrenci / Mühendis (görünüm başına saklanır; anlatım Hikaye, ayrıntılı Mühendis ile açılır)
    let [duzey, setDuzeyHam] = useState<Duzey>(ayrinti ? 'muhendis' : 'hikaye');
    useEffect(() => { try { let x = localStorage.getItem('gezgin-duzey-' + mod); if (x === 'hikaye' || x === 'ogrenci' || x === 'muhendis') setDuzeyHam(x); } catch { } }, [mod]);
    let setDuzey = useCallback((x: Duzey) => { setDuzeyHam(x); try { localStorage.setItem('gezgin-duzey-' + mod, x); } catch { } }, [mod]);

    // "önce tahmin et" soruları: kart kapandıktan sonra (ya da kart yoksa adım başında) sorulur; cümle değişince sıfırlanır
    let [sorularAcik, setSorularAcikHam] = useState(true);
    useEffect(() => { try { if (localStorage.getItem('gezgin-sorular') === '0') setSorularAcikHam(false); } catch { } }, []);
    let setSorularAcik = useCallback((a: boolean) => { setSorularAcikHam(a); try { localStorage.setItem('gezgin-sorular', a ? '1' : '0'); } catch { } }, []);
    let [soru, setSoru] = useState<number | null>(null);
    let soruRef = useRef<number | null>(null); soruRef.current = soru;
    let [cevaplar, setCevaplar] = useState<Record<number, number>>({});
    let sorular = useMemo(() => !veri ? {} : ayrinti
        ? (ayVeri ? ayrintiSorulari(ayVeri, ids => sicaklikliOlasilik(ayVeri!.logitler, ids, 1)) : {})
        : anlatimSorulari(veri, d.dikkat), [veri, ayVeri, ayrinti, d.dikkat.katman, d.dikkat.bas]); // eslint-disable-line react-hooks/exhaustive-deps
    let sorularRef = useRef(sorular); sorularRef.current = sorular;
    let cevaplarRef = useRef(cevaplar); cevaplarRef.current = cevaplar;
    let sorularAcikRef = useRef(sorularAcik); sorularAcikRef.current = sorularAcik;
    useEffect(() => { setCevaplar({}); }, [veri?.ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    // kart kapandıktan sonra: soru varsa sor, yoksa oynat
    let devamEt = useCallback(() => {
        let k = saat.durum.adim;
        if (sorularAcikRef.current && sorularRef.current[k] && cevaplarRef.current[k] === undefined) { setSoru(k); saat.ayarla({ oynuyor: false }); }
        else { setSoru(null); saat.ayarla({ oynuyor: true }); }
    }, [saat]);
    let kartKapat = useCallback(() => { setKart(null); devamEt(); }, [devamEt]);
    let kartAc = useCallback(() => { setSoru(null); setKart(saat.durum.adim); saat.ayarla({ oynuyor: false }); }, [saat]);
    let cevapla = useCallback((id: number) => { let k = soruRef.current; if (k === null) return; setCevaplar(c => ({ ...c, [k!]: id })); setSoru(null); saat.ayarla({ oynuyor: true }); }, [saat]);
    let soruAtla = useCallback(() => { setSoru(null); saat.ayarla({ oynuyor: true }); }, [saat]);
    let kartListesi = useMemo(() => ayrinti ? (ayVeri ? ayrintiKartlari(ayVeri) : null) : veri ? kartlar(veri) : null, [veri, ayVeri, ayrinti]);
    // yeni adıma geçince: kart görülmediyse önce kart, sonra (varsa) soru; ikisi de yoksa animasyon kendiliğinden sürer
    useEffect(() => {
        if (!veri || !kartListesi) return;
        if (kartlarAcik && !gorulen.current.has(d.adim)) {
            gorulen.current.add(d.adim);
            setSoru(null); setKart(d.adim); saat.ayarla({ oynuyor: false, t: 0 });
        } else {
            setKart(null);
            if (sorularAcik && sorular[d.adim] && cevaplar[d.adim] === undefined) { setSoru(d.adim); saat.ayarla({ oynuyor: false, t: 0 }); }
            else setSoru(null);
        }
    }, [d.adim, veri?.ids.join(','), !!kartListesi]); // eslint-disable-line react-hooks/exhaustive-deps

    // klavye: Boşluk oynat/duraklat, ← → adım, R kamera, + − yakınlaş, K bilgi kartı, D düzey
    useEffect(() => {
        let f = (e: KeyboardEvent) => {
            if (yaziAlaniMi(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
            let k = e.key;
            if (kartRef.current !== null) {
                if (k === ' ' || k === 'Enter' || k === 'Escape' || k === 'ArrowRight') { kartKapat(); e.preventDefault(); return; }
                if (k === 'ArrowLeft' || /^[0-9]$/.test(k)) setKart(null);
                else if (k !== 'f' && k !== 'F') return;
            } else if (soruRef.current !== null) {
                let so = sorularRef.current[soruRef.current];
                if (/^[1-9]$/.test(k) && so && so.secenekler[+k - 1]) { cevapla(so.secenekler[+k - 1].id); e.preventDefault(); return; }
                if (k === 'Escape' || k === 'ArrowRight') { soruAtla(); e.preventDefault(); return; }
                if (k === 'ArrowLeft') setSoru(null);
                else if (k !== 'f' && k !== 'F') return;
            } else if (k === 'k' || k === 'K') { kartAc(); return; }
            else if (k === 'd' || k === 'D') { setDuzey(DUZEYLER[(DUZEYLER.findIndex(x => x.id === duzeyRef.current) + 1) % 3].id); return; }
            if (k === ' ') { saat.oynatDuraklat(); e.preventDefault(); }
            else if (k === 'ArrowRight') { saat.ileri(); e.preventDefault(); }
            else if (k === 'ArrowLeft') { saat.geri(); e.preventDefault(); }
            else if (k === 'r' || k === 'R') saat.kamerayiSifirla();
            else if (k === 'f' || k === 'F') tamEkranDegistir();
            else if (k === 'm' || k === 'M') setMimariAcik(a => !a);
            else if (k === '+' || k === '=') kontrol.current?.dolly(3, true);
            else if (k === '-' || k === '_') kontrol.current?.dolly(-3, true);
            else if (/^[0-9]$/.test(k)) saat.adimaGit(k === '0' ? 9 : +k - 1);
            else if (ayrinti && (k === 'q' || k === 'Q')) saat.adimaGit(10);
            else if (ayrinti && (k === 'w' || k === 'W')) saat.adimaGit(11);
        };
        window.addEventListener('keydown', f);
        return () => window.removeEventListener('keydown', f);
    }, [saat, tamEkranDegistir, kartKapat, kartAc, ayrinti, cevapla, soruAtla, setDuzey]);
    let duzeyRef = useRef(duzey); duzeyRef.current = duzey;

    let adim = adimlar[d.adim];
    // düzeye göre altyazı: Hikaye kendi vuruşlarıyla, Mühendis altyazı + formül
    let ek = ayrinti ? AYRINTI_EK[d.adim] : ANLATIM_EK[d.adim];
    let kaynak: any = ayrinti ? ayVeri : veri;
    let vuruslar = !kaynak ? [] : duzey === 'hikaye' && ek ? ek.hikaye(kaynak, d.dikkat) : adim.vuruslar(kaynak, d.dikkat);
    let formul = kaynak && duzey === 'muhendis' && ek ? ek.formul(kaynak, d.dikkat) : null;
    let soruNesnesi = soru !== null ? (sorular as Record<number, ISoru>)[soru] : null;
    let cevapNesnesi = cevaplar[d.adim] !== undefined ? (sorular as Record<number, ISoru>)[d.adim] : null;
    let vurus = vuruslar.filter(v => v.t <= d.t + 1e-6).pop() ?? vuruslar[0];
    let bitti = !d.oynuyor && d.t >= adim.sure - 0.05;
    let tokenSayisi = model ? model.tok.kodla(metin).length : 0;
    let tahmin = veri?.olasiliklar.slice(0, 5) ?? [];

    return <main className={s.alan} ref={alanRef} style={{ '--sol': `${bosluk.sol}px` } as React.CSSProperties}>
        {/* sahne kendi yığın bağlamında: 3B içindeki HTML etiketleri (drei Html, çok büyük z-index) arayüzün üstüne çıkmasın */}
        <div className={s.sahneKap}>
            {!ayrinti && veri && <Sahne saat={saat} veri={veri} kontrol={kontrol} bosluk={bosluk} />}
            {ayrinti && veri && ayVeri && <AyrintiSahne saat={saat} v={ayVeri} h={veri} kontrol={kontrol} bosluk={bosluk} />}
        </div>

        {veri && !sahneHazir && <div className={s.sahneYukleniyor}>{L('3B sahne hazırlanıyor…', 'Preparing the 3D scene…')}</div>}

        {/* adımlar */}
        <nav className={s.adimlar} aria-label={L('Adımlar', 'Steps')}>
            {adimlar.map((a, i) => <button key={i} className={clsx(s.adimDugme, i === d.adim && s.adimSecili, i < d.adim && s.adimGecti)}
                onClick={() => saat.adimaGit(i)} title={`${i + 1}. ${a.baslik} (${L('tuş', 'key')} ${i < 10 ? (i + 1) % 10 : i === 10 ? 'Q' : 'W'})`}>
                <span className={s.adimNo}>{i + 1}</span><span className={s.adimAd}>{a.baslik}</span>
            </button>)}
        </nav>

        {/* dikkat bölümünde blok/baş seçici */}
        {veri && (ayrinti ? d.adim >= 0 && d.adim <= 8 : d.adim === 4 || d.adim === 5) && <div className={s.secici}>
            <span className={s.seciciBaslik}>{ayrinti ? L('İzlenen blok ve baş', 'Block and head shown') : L('Dikkat başı', 'Attention head')}</span>
            <label>{L('Blok', 'Block')} <select value={d.dikkat.katman} onChange={e => saat.ayarla({ dikkat: { ...d.dikkat, katman: +e.target.value } })}>
                {Array.from({ length: veri.L }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}
            </select></label>
            <label>{L('Baş', 'Head')} <select value={d.dikkat.bas} onChange={e => saat.ayarla({ dikkat: { ...d.dikkat, bas: +e.target.value } })}>
                {Array.from({ length: veri.H }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}
            </select></label>
            <button className={s.kucukDugme} onClick={() => saat.ayarla({ dikkat: veri!.varsayilanDikkat })} title={L('Ara parçalara en net bakan baş', 'The head that looks most clearly at earlier tokens')}>{L('Belirgin', 'Clearest')}</button>
        </div>}

        {/* cümle paneli */}
        <aside className={clsx(s.panel, !panelAcik && s.panelKapali)}>
            <div className={s.panelUst}>
                <span className={s.panelBaslik}>{L('Türkçe GPT-2 · tarayıcınızda', 'GPT-2 · in your browser')}</span>
                <button className={s.kapat} onClick={() => setPanelAcik(!panelAcik)} aria-label={panelAcik ? L('Paneli küçült', 'Collapse panel') : L('Paneli aç', 'Expand panel')}>{panelAcik ? '–' : '+'}</button>
            </div>
            {panelAcik && <>
                <form className={s.satir} onSubmit={e => { e.preventDefault(); if (tokenSayisi <= EN_FAZLA) calistir(metin); }}>
                    <input className={s.girdi} value={metin} onChange={e => setMetin(e.target.value)} maxLength={120} aria-label={L('Cümle', 'Sentence')} disabled={!model} />
                    <button className={s.dugme} type="submit" disabled={!model || calisiyor || !metin.trim() || tokenSayisi > EN_FAZLA}>{calisiyor ? '…' : L('Çalıştır', 'Run')}</button>
                </form>
                <div className={s.not}>{tokenSayisi > EN_FAZLA ? L(`En fazla ${EN_FAZLA} parça; şu an ${tokenSayisi}.`, `At most ${EN_FAZLA} tokens; now ${tokenSayisi}.`) : L(`${tokenSayisi} parça · en fazla ${EN_FAZLA}`, `${tokenSayisi} tokens · max ${EN_FAZLA}`)}</div>
                {tahmin.length > 0 && <div className={s.tahminler}>
                    <div className={s.altBaslik}>{L('Sıradaki parça · tıklayıp ekleyin', 'Next token · click to append')}</div>
                    {tahmin.map(t => <button key={t.id} className={s.tahmin} disabled={calisiyor} onClick={() => { let y = metin + t.metin; setMetin(y); calistir(y); }}>
                        <span className={s.tahminMetin}>{okunur(t.metin)}</span>
                        <span className={s.tahminCubuk}><span style={{ width: `${Math.max(3, t.p / tahmin[0].p * 100)}%` }} /></span>
                        <span className={s.yuzde}>{yuzde(t.p)}</span>
                    </button>)}
                </div>}
            </>}
        </aside>

        {/* altyazı ve oynatıcı */}
        {veri && <div className={s.alt}>
            <div className={s.altUst}>
                <div className={s.duzeySecici} role="group" aria-label={L('Anlatım düzeyi', 'Explanation level')}>
                    {DUZEYLER.map(x => <button key={x.id} className={clsx(s.duzeyDugme, duzey === x.id && s.duzeySecili)} onClick={() => setDuzey(x.id)}
                        title={`${x.ipucu} (D)`} aria-pressed={duzey === x.id}>{x.ad}</button>)}
                </div>
                {cevapNesnesi && <SoruSonucu soru={cevapNesnesi} secilen={cevaplar[d.adim]} />}
                <label className={s.soruAnahtar} title={L('Bazı adımlardan önce "önce tahmin et" sorusu sor', 'Ask a "guess first" question before some steps')}>
                    <input type="checkbox" checked={sorularAcik} onChange={e => setSorularAcik(e.target.checked)} /> {L('Tahmin soruları', 'Guess questions')}
                </label>
            </div>
            <div className={s.altyazi} key={`${d.adim}-${vurus?.t}-${duzey}`}>
                <span className={s.altyaziAdim}>{d.adim + 1}/{adimlar.length} · {adim.baslik}</span>
                <span><TerimliMetin metin={vurus?.metin ?? ''} /></span>
                {formul && <span className={s.formul}>{formul}</span>}
            </div>
            <div className={s.oynatici}>
                <button className={s.yuvarlak} onClick={() => saat.geri()} title={L('Geri (←)', 'Back (←)')} aria-label={L('Geri', 'Back')}>
                    <svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
                </button>
                <button className={clsx(s.yuvarlak, s.ana)} onClick={() => saat.oynatDuraklat()} title={L('Oynat / duraklat (Boşluk)', 'Play / pause (Space)')} aria-label={L('Oynat ya da duraklat', 'Play or pause')}>
                    {bitti ? <svg viewBox="0 0 20 20"><path d="M6 4.5 13.5 10 6 15.5M14.5 4.5v11" /></svg>
                        : d.oynuyor ? <svg viewBox="0 0 20 20"><path d="M7 4.5v11M13 4.5v11" /></svg>
                            : <svg viewBox="0 0 20 20"><path d="M6.5 4.5 15 10l-8.5 5.5z" /></svg>}
                </button>
                <button className={s.yuvarlak} onClick={() => saat.ileri()} title={L('İleri (→)', 'Forward (→)')} aria-label={L('İleri', 'Forward')}>
                    <svg viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
                </button>
                {<button className={clsx(s.yuvarlak, kart !== null && s.yuvarlakSecili)} onClick={() => kart !== null ? kartKapat() : kartAc()} title={L('Bu adımın bilgi kartı (K)', 'Info card for this step (K)')} aria-label={L('Bilgi kartı', 'Info card')}>
                    <svg viewBox="0 0 20 20"><path d="M10 5.5C8.2 4.2 5.8 3.8 3 4v11c2.8-.2 5.2.2 7 1.5 1.8-1.3 4.2-1.7 7-1.5V4c-2.8-.2-5.2.2-7 1.5zM10 5.5v11" /></svg>
                </button>}
                <div className={s.ilerlemeCubuk}><span style={{ width: `${Math.min(100, d.t / adim.sure * 100)}%` }} /></div>
                <div className={s.hizlar} role="group" aria-label={L('Hız', 'Speed')}>
                    {[0.5, 1, 1.5, 2].map(h => <button key={h} className={clsx(s.hiz, d.hiz === h && s.hizSecili)} onClick={() => saat.ayarla({ hiz: h })}>{h.toLocaleString(YEREL)}×</button>)}
                </div>
                <label className={s.otomatik} title={L('Adım bitince kendiliğinden sonrakine geç', 'Go to the next step automatically')}>
                    <input type="checkbox" checked={d.otomatik} onChange={e => saat.ayarla({ otomatik: e.target.checked })} /> {L('Otomatik', 'Auto')}
                </label>
                <button className={s.yuvarlak} onClick={() => kontrol.current?.dolly(3, true)} title={L('Yakınlaş (+)', 'Zoom in (+)')} aria-label={L('Yakınlaş', 'Zoom in')}>
                    <svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5 17 17M6 8.5h5M8.5 6v5" /></svg>
                </button>
                <button className={s.yuvarlak} onClick={() => kontrol.current?.dolly(-3, true)} title={L('Uzaklaş (−)', 'Zoom out (−)')} aria-label={L('Uzaklaş', 'Zoom out')}>
                    <svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5 17 17M6 8.5h5" /></svg>
                </button>
                <button className={clsx(s.yuvarlak, tamEkran && s.yuvarlakSecili)} onClick={tamEkranDegistir} title={tamEkran ? L('Tam ekrandan çık (F ya da Esc)', 'Exit full screen (F or Esc)') : L('Tam ekran (F)', 'Full screen (F)')} aria-label={L('Tam ekran', 'Full screen')}>
                    {tamEkran ? <svg viewBox="0 0 20 20"><path d="M7.5 3.5v4h-4M12.5 3.5v4h4M7.5 16.5v-4h-4M12.5 16.5v-4h4" /></svg>
                        : <svg viewBox="0 0 20 20"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" /></svg>}
                </button>
                <button className={s.yuvarlak} onClick={() => saat.kamerayiSifirla()} title={L('Kamerayı adımın görünümüne döndür (R)', 'Reset camera to this step (R)')} aria-label={L('Kamerayı sıfırla', 'Reset camera')}>
                    <svg viewBox="0 0 20 20"><path d="M3.5 9.5 10 4l6.5 5.5M5.5 8v7.5h9V8" /></svg>
                </button>
            </div>
            {bitti && d.adim < adimlar.length - 1 && <div className={s.devam}>{L('Devam için', 'Continue with')} <kbd>→</kbd> {L('ya da', 'or')} <kbd>{L('Boşluk', 'Space')}</kbd></div>}
        </div>}

        {/* sıcaklık (ayrıntılı, son adım) */}
        {ayrinti && veri && d.adim === 11 && <div className={s.secici}>
            <span className={s.seciciBaslik}>{L('Sıcaklık', 'Temperature')}</span>
            <input type="range" min={0.1} max={2.5} step={0.05} value={d.sicaklik} onChange={e => saat.ayarla({ sicaklik: +e.target.value })} aria-label={L('Sıcaklık', 'Temperature')} />
            <span className={s.sicaklikDeger}>{d.sicaklik.toLocaleString(YEREL, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button className={s.kucukDugme} onClick={() => saat.ayarla({ sicaklik: 1 })}>1,0</button>
        </div>}

        {/* hücre bilgisi */}
        {ayrinti && ipucuDeger && <div className={s.ipucu2} style={{ left: ipucuDeger.x + 14, top: ipucuDeger.y - 48 }}>{ipucuDeger.metin}</div>}

        {/* mimari haritası + renk anahtarı */}
        {veri && <Mimari mod={mod} adim={d.adim} katman={d.dikkat.katman} bas={d.dikkat.bas} L={veri.L} H={veri.H}
            tokenler={veri.tokenler} tahmin={veri.olasiliklar}
            acik={mimariAcik} setAcik={setMimariAcik} git={k => saat.adimaGit(k)} anahtar={<>
                <span><i style={{ background: '#33e0b0' }} /><i style={{ background: '#ff5c8a' }} />{L('işlenen sayı (+ / −)', 'activation (+ / −)')}</span>
                <span><i style={{ background: '#6c8cff' }} /><i style={{ background: '#ffb347' }} />{L('öğrenilmiş ağırlık (+ / −)', 'learned weight (+ / −)')}</span>
                <span><i style={{ background: '#ff3b5c' }} />{L('izlenen parça', 'tracked token')}</span>
                {ayrinti && <span><i style={{ background: '#ffd166' }} />{L('olasılık / dikkat payı', 'probability / attention share')}</span>}
                {ayrinti && <span><i style={{ background: '#5a0f24' }} />{L('maske (−∞)', 'mask (−∞)')}</span>}
                <span className={s.ipucu}>{L('sürükle: döndür · sağ tık: kaydır · tekerlek: yakınlaş', 'drag: rotate · right-click: pan · wheel: zoom')}{ayrinti ? L(' · hücreye gel: değer', ' · hover a cell: value') : ''} · F: {L('tam ekran', 'full screen')} · M: {L('harita', 'map')}{L(' · K: bilgi kartı · D: düzey', ' · K: info card · D: level')}</span>
            </>} />}

        {/* bilgi kartı */}
        {kart !== null && kartListesi && kartListesi[kart] && <Kart kart={kartListesi[kart]} no={kart} toplam={kartListesi.length} kapat={kartKapat}
            kartlarAcik={kartlarAcik} setKartlarAcik={setKartlarAcik} />}

        {/* önce tahmin et */}
        {soruNesnesi && kart === null && <SoruPenceresi soru={soruNesnesi} cevapla={cevapla} atla={soruAtla} sorularAcik={sorularAcik} setSorularAcik={setSorularAcik} />}

        {/* yükleme */}
        {!veri && <div className={s.yukleme}>
            {hata ? <div className={s.hata}>{L('Model indirilemedi', 'Model could not be downloaded')}: {hata}</div>
                : izin === false ? <div className={s.yuklemeKutu}>
                    <p>{L('Bu görünüm bilgisayar için tasarlandı: model 125 MB indirir. Telefonda yavaş çalışabilir.', 'This view is designed for computers: the model downloads 125 MB. It may be slow on a phone.')}</p>
                    <button className={s.dugme} onClick={() => setIzin(true)}>{L('Yine de indir', 'Download anyway')}</button>
                </div>
                    : <div className={s.yuklemeKutu}>
                        <div className={s.yuklemeBaslik}>{model ? L('Model çalışıyor…', 'Running the model…') : L('Türkçe GPT-2 iniyor', 'Downloading GPT-2')}</div>
                        <div className={s.yuklemeCubuk}><span style={{ width: `${Math.round((model ? 1 : ilerleme) * 100)}%` }} /></div>
                        <div className={s.not}>{L('125 MB, yalnızca ilk açılışta; sonra tarayıcıda saklanır.', '125 MB, only on first visit; then cached in your browser.')}</div>
                    </div>}
        </div>}
    </main>;
};
