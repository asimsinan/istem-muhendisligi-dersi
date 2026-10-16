'use client';
// TR: "Önce tahmin et" penceresi ve cevaptan sonra altyazının üstünde kalan sonuç rozeti.
import React from 'react';
import clsx from 'clsx';
import { Gezgin } from './Kart';
import { ISoru, degerYazi } from './sorular';
import { L } from '../llm/tr/dil';
import s from './hikaye.module.scss';

export const SoruPenceresi: React.FC<{ soru: ISoru; cevapla: (id: number) => void; atla: () => void; sorularAcik: boolean; setSorularAcik: (a: boolean) => void }> =
    ({ soru, cevapla, atla, sorularAcik, setSorularAcik }) =>
        <div className={s.kartPerde} onClick={e => { if (e.target === e.currentTarget) atla(); }}>
            <section className={s.soruKutu} role="dialog" aria-modal="true" aria-labelledby="soru-baslik">
                <div className={s.soruUst}>
                    <div className={s.gezginKutu}><Gezgin boyut={74} /><span className={s.gezginAd}>ASY</span></div>
                    <div>
                        <div className={s.soruEtiket}>{L('Önce tahmin et', 'Guess first')}</div>
                        <h2 id="soru-baslik">{soru.soru}</h2>
                        <p className={s.ornekNot}>{soru.ipucu}</p>
                    </div>
                </div>
                <div className={s.soruSecenekler}>
                    {soru.secenekler.map((o, i) => <button key={o.id} className={s.soruSecenek} onClick={() => cevapla(o.id)} autoFocus={i === 0}>
                        <kbd>{i + 1}</kbd>{o.metin}
                    </button>)}
                </div>
                <div className={s.kartAlt}>
                    <label className={s.kartSecenek}>
                        <input type="checkbox" checked={!sorularAcik} onChange={e => setSorularAcik(!e.target.checked)} /> {L('Soruları gösterme', "Don't ask questions")}
                    </label>
                    <button className={s.kucukDugme} onClick={atla}>{L('Atla ▶', 'Skip ▶')}</button>
                </div>
            </section>
        </div>;

export const SoruSonucu: React.FC<{ soru: ISoru; secilen: number }> = ({ soru, secilen }) => {
    let d = soru.secenekler.find(o => o.id === soru.dogru)!, sec = soru.secenekler.find(o => o.id === secilen)!;
    let tamam = secilen === soru.dogru;
    return <div className={clsx(s.soruSonuc, tamam ? s.soruDogru : s.soruYanlis)} role="status">
        {tamam
            ? L(`✓ Doğru tahmin: "${d.metin}" (${soru.birim} ${degerYazi(d.deger)})`, `✓ Correct: "${d.metin}" (${soru.birim} ${degerYazi(d.deger)})`)
            : L(`Senin tahminin "${sec.metin}" (${degerYazi(sec.deger)}) · model: "${d.metin}" (${degerYazi(d.deger)})`, `Your guess "${sec.metin}" (${degerYazi(sec.deger)}) · model: "${d.metin}" (${degerYazi(d.deger)})`)}
    </div>;
};
