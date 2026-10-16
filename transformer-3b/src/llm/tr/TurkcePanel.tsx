'use client';
// TR: 3B sahnenin üstündeki Türkçe giriş paneli: cümle yaz, çalıştır, sıradaki token'ı ekle, tahminleri gör.
import React, { useState } from 'react';
import { useProgramState } from '../Sidebar';
import { ITurkceLink, enOlasilar } from './TurkceModel';
import { ORNEK_CUMLE, T_GORUNUM, OZET, KANAL_ADIMI, GERCEK, gorunumAdresi } from './ayarlar';
import s from './TurkcePanel.module.scss';
import clsx from 'clsx';

export const TurkcePanel: React.FC<{
    ilerleme: number;
    hata: string | null;
    calistir: (metin: string) => unknown;
    izinBekliyor?: boolean;
    izinVer?: () => void;
}> = ({ ilerleme, hata, calistir, izinBekliyor, izinVer }) => {
    let prog = useProgramState();
    let link = prog.jsGptModel as ITurkceLink | null;
    let [metin, setMetin] = useState(ORNEK_CUMLE);
    let [acik, setAcik] = useState(true);
    // TR: ileri geçiş ~1 sn ana iş parçacığını tutar; önce "çalışıyor" yazısı boyansın, sonra sonuç bildirilsin
    let [durum, setDurum] = useState<null | 'calisiyor' | { sn: number; sayac: number }>(null);
    let hazir = !!link?.turkce;
    let sonuc = link?.sonuc ?? null;
    let tahminler = link && sonuc ? enOlasilar(link, sonuc.n - 1, 5) : [];
    let tokenSayisi = hazir ? link!.turkce.tok.kodla(metin).length : 0;
    let fazla = tokenSayisi > T_GORUNUM;

    let calisanMetin = hazir && sonuc ? link!.turkce.tok.coz(sonuc.ids.slice(0, sonuc.n)) : null;
    let degisti = calisanMetin !== null && metin !== calisanMetin;

    function uygula(yeni = metin) {
        setMetin(yeni);
        setDurum('calisiyor');
        setTimeout(() => {
            let t0 = performance.now();
            calistir(yeni);
            let sn = (performance.now() - t0) / 1000;
            setDurum(d => ({ sn, sayac: (d && d !== 'calisiyor' ? d.sayac : 0) + 1 }));
        }, 30);
    }

    if (hata) {
        return <div className={s.panel}><div className={s.hata}>Model indirilemedi: {hata}. Bağlantıyı kontrol edip sayfayı yenileyin.</div></div>;
    }
    if (izinBekliyor) {
        return <div className={s.panel}>
            <div className={s.aciklama} style={{ marginTop: 0 }}>3B görünüm bilgisayar için tasarlandı: model 125 MB indirir ve ekran kartında yaklaşık 400 MB yer kaplar. Telefonda yavaş çalışabilir ya da sayfa kapanabilir.</div>
            <button className={s.dugme} style={{ marginTop: '0.5rem' }} onClick={izinVer}>Yine de indir</button>
        </div>;
    }
    if (!hazir) {
        return <div className={s.panel}>
            <div className={s.durum}>
                <span className={s.rozet}>Türkçe GPT-2 iniyor · %{Math.round(ilerleme * 100)}</span>
                <span className={s.cubuk}><span style={{ width: `${Math.round(ilerleme * 100)}%` }} /></span>
            </div>
            <div className={s.aciklama}>125 MB, yalnızca ilk açılışta; sonra tarayıcıda saklanır.</div>
        </div>;
    }
    if (!acik) {
        return <div className={s.panel}><button className={s.kucukDugme} onClick={() => setAcik(true)}>Cümleyi değiştir ▸</button></div>;
    }

    return <div className={s.panel}>
        <div className={s.ust}>
            <span className={s.baslik}>Türkçe GPT-2 · 124M · tarayıcınızda çalışıyor</span>
            <button className={s.kapat} onClick={() => setAcik(false)} aria-label="Paneli küçült">–</button>
        </div>
        <div className={s.gorunum} role="group" aria-label="Sahne görünümü">
            <a className={clsx(s.secenek, OZET && s.secili)} href={OZET ? undefined : gorunumAdresi(false)}
                title={`Her ${KANAL_ADIMI}. kanal çizilir (${GERCEK.C / KANAL_ADIMI} hücre); hücreler yakınlaşmadan görünür`}>Özet</a>
            <a className={clsx(s.secenek, !OZET && s.secili)} href={OZET ? gorunumAdresi(true) : undefined}
                title={`Bütün ${GERCEK.C} kanal çizilir; hücreler için yakınlaşmak gerekir`}>Gerçek boyut</a>
            <span className={s.gorunumNot}>{OZET ? `${GERCEK.C} kanalın her ${KANAL_ADIMI}.si` : `${GERCEK.C} kanalın hepsi`}</span>
        </div>
        <form className={s.satir} onSubmit={e => { e.preventDefault(); if (!fazla) uygula(); }}>
            <input className={s.girdi} value={metin} onChange={e => setMetin(e.target.value)} maxLength={200}
                onKeyDown={e => e.stopPropagation()} aria-label="Cümle" />
            <button className={s.dugme} type="submit" disabled={fazla || !metin.trim() || durum === 'calisiyor'}>{durum === 'calisiyor' ? 'Çalışıyor…' : 'Çalıştır'}</button>
        </form>
        <div className={s.aciklama}>{fazla ? `En fazla ${T_GORUNUM} token; şu an ${tokenSayisi}.` : `${tokenSayisi} token · en fazla ${T_GORUNUM}`}</div>
        {durum === 'calisiyor'
            ? <div className={s.bilgi}>Model 12 katmanı hesaplıyor…</div>
            : degisti
                ? <div className={s.bilgi}>Cümle değişti: sahneyi ve anlatımı güncellemek için <b>Çalıştır</b>'a basın.</div>
                : durum && <div key={durum.sayac} className={clsx(s.bilgi, s.tamam)}>✓ Sahne, sol şema ve anlatım bu cümleyle güncellendi · {durum.sn.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn</div>}
        {sonuc && <div key={durum && durum !== 'calisiyor' ? durum.sayac : 0} className={clsx(s.tokenler, durum && durum !== 'calisiyor' && s.parla)}>
            {sonuc.ids.map((id, i) => <span key={i} className={s.token} title={`#${id}`}>{link!.turkce.tok.coz([id]).replace(/ /g, '·')}</span>)}
        </div>}
        {tahminler.length > 0 && <div className={s.tahminler}>
            <div className={s.altBaslik}>Sıradaki token</div>
            {tahminler.map((t, i) => <button key={t.id} className={s.tahmin} disabled={sonuc!.n >= T_GORUNUM}
                title="Bu token'ı ekleyip yeniden çalıştır" onClick={() => uygula(metin + t.metin)}>
                <span className={s.tahminMetin}>{t.metin.replace(/ /g, '·')}</span>
                <span className={s.tahminCubuk}><span style={{ width: `${Math.max(2, t.p * 100)}%` }} /></span>
                <span className={s.yuzde}>%{(t.p * 100).toFixed(1)}</span>
            </button>)}
        </div>}
    </div>;
};
