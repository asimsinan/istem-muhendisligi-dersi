'use client';
// TR: "Şu an ne oluyor?" kutusu. 3B sahnenin sol üstünde, anlatımın o anki bölümünü tek cümleyle özetler ve
// sahnede küçük kalan sayıları büyük yazar: gömme vektörleri, normalizasyon özetleri, "o"nun dikkat dağılımı,
// MLP etkinliği, her bloktan sonraki tahmin (logit merceği) ve son olasılıklar. Bütün sayılar tarayıcıda çalışan
// modelin gerçek değerleridir (tam boyutta, 768 kanal).
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useProgramState } from '../Sidebar';
import { Phase } from '../walkthrough/Walkthrough';
import { ISonuc, ITurkceLink, ITurkceModel, enOlasilar } from './TurkceModel';
import { odak, odakAyarla } from './odak';
import { GERCEK, OZET } from './ayarlar';
import s from './DurumKutusu.module.scss';

const SIRA: Phase[] = [
    Phase.Intro_Intro, Phase.Intro_Prelim, Phase.Input_Detail_Embedding, Phase.Input_Detail_LayerNorm,
    Phase.Input_Detail_SelfAttention, Phase.Input_Detail_Projection, Phase.Input_Detail_Mlp,
    Phase.Input_Detail_Transformer, Phase.Input_Detail_Softmax, Phase.Input_Detail_Output,
];

const ADIM_SAYISI = 6; // vektörlerden gösterilen ilk eleman sayısı
const okunur = (t: string) => t.replace(/ /g, '·');
const say = (v: number, b = 2) => v.toLocaleString('tr-TR', { minimumFractionDigits: b, maximumFractionDigits: b });
const yuzde = (p: number) => '%' + (p * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });

// ---------- küçük görseller ----------

// Vektörün ilk birkaç elemanı: renkli hücre + sayı (yeşil = işlenen sayı, mavi = ağırlık; sahnedeki renklerle aynı)
const Vektor: React.FC<{ ad: React.ReactNode; v: ArrayLike<number>; tur?: 'veri' | 'agirlik'; isaret?: string }> = ({ ad, v, tur = 'veri', isaret }) => {
    let n = Math.min(ADIM_SAYISI, v.length);
    let mx = 1e-6;
    for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(v[i]));
    let basamak = mx < 1 ? 3 : 2; // küçük değerler (gömme ~0,03) 0,00 görünmesin
    return <div className={s.vektorSatir}>
        <span className={s.isaret}>{isaret ?? ''}</span>
        <div>
            <div className={s.vektorAd}>{ad}</div>
            <div className={s.hucreler}>
                {Array.from({ length: n }, (_, i) => {
                    let a = Math.min(1, Math.abs(v[i]) / mx);
                    let renk = v[i] >= 0
                        ? (tur === 'veri' ? `rgba(46,160,67,${0.15 + 0.6 * a})` : `rgba(64,80,200,${0.15 + 0.6 * a})`)
                        : `rgba(120,120,120,${0.12 + 0.5 * a})`;
                    return <span key={i} className={s.hucre} style={{ background: renk }}>{say(v[i], basamak)}</span>;
                })}
                <span className={s.devam}>…</span>
            </div>
        </div>
    </div>;
};

const Cubuklar: React.FC<{ satirlar: { ad: string; p: number; vurgu?: boolean; ek?: string }[] }> = ({ satirlar }) => {
    let mx = Math.max(1e-9, ...satirlar.map(r => r.p));
    return <div className={s.cubuklar}>
        {satirlar.map((r, i) => <div key={i} className={clsx(s.cubukSatir, r.vurgu && s.vurgu)}>
            <span className={s.cubukAd}>{r.ad}</span>
            <span className={s.cubuk}><span style={{ width: `${Math.max(2, (r.p / mx) * 100)}%` }} /></span>
            <span className={s.cubukDeger}>{r.ek ?? yuzde(r.p)}</span>
        </div>)}
    </div>;
};

const Parca: React.FC<{ t: string; vurgu?: boolean; alt?: string }> = ({ t, vurgu, alt }) =>
    <span className={clsx(s.parca, vurgu && s.parcaVurgu)}>{okunur(t)}{alt !== undefined && <small>{alt}</small>}</span>;

// ---------- modelden okunan değerler ----------

const satir = (v: Float32Array, t: number, C: number) => v.subarray(t * C, (t + 1) * C);

function tokGomme(m: ITurkceModel, id: number) {
    let C = m.config.n_embd, w = m.t.wte, out = new Float32Array(C), sc = w.olcek![id];
    for (let c = 0; c < C; c++) out[c] = w.i8![id * C + c] * sc;
    return out;
}

// Logit merceği: her bloğun çıktısını son katman normu + çıktı matrisinden geçirip o bloktaki tahmini bul
interface IMercek { blok: number; metin: string; p: number }
const mercekOnbellek = new WeakMap<ISonuc, IMercek[]>();
function logitMercegi(m: ITurkceModel, sn: ISonuc): IMercek[] {
    let hazir = mercekOnbellek.get(sn);
    if (hazir) return hazir;
    let { n_embd: C, vocab_size: V } = m.config;
    let g = m.t['ln_f.g'].f32!, b = m.t['ln_f.b'].f32!, W = m.t.wte;
    let t = sn.n - 1, x = new Float32Array(C), sonuc: IMercek[] = [];
    let logit = new Float32Array(V);
    sn.bloklar.forEach((k, l) => {
        let r = satir(k.res2, t, C), ort = 0, vr = 0;
        for (let c = 0; c < C; c++) ort += r[c];
        ort /= C;
        for (let c = 0; c < C; c++) vr += (r[c] - ort) ** 2;
        let sd = Math.sqrt(vr / C + 1e-5);
        for (let c = 0; c < C; c++) x[c] = (r[c] - ort) / sd * g[c] + b[c];
        let mx = -Infinity, en = 0;
        for (let v = 0; v < V; v++) {
            let o = v * C, d = 0;
            for (let c = 0; c < C; c++) d += W.i8![o + c] * x[c];
            d *= W.olcek![v];
            logit[v] = d;
            if (d > mx) { mx = d; en = v; }
        }
        let top = 0;
        for (let v = 0; v < V; v++) top += Math.exp(logit[v] - mx);
        sonuc.push({ blok: l + 1, metin: m.tok.coz([en]), p: 1 / top });
    });
    mercekOnbellek.set(sn, sonuc);
    return sonuc;
}

// ---------- kutu ----------

export const DurumKutusu: React.FC = () => {
    let prog = useProgramState();
    let link = prog.jsGptModel as ITurkceLink | null;
    let sn = link?.sonuc ?? null;
    let [acik, setAcik] = useState(true);
    let [, yenile] = useState(0);
    let [mercek, setMercek] = useState<{ sn: ISonuc; liste: IMercek[] } | null>(null);
    let faz = prog.walkthrough.phase;

    useEffect(() => {
        try { setAcik(window.localStorage.getItem('transformer-3b-durum') !== '0'); } catch { /* yok */ }
    }, []);

    // Logit merceği ~1 sn sürer: yalnızca o bölüm açıkken, ekranı dondurmadan arkadan hesapla
    useEffect(() => {
        if (faz !== Phase.Input_Detail_Transformer || !link || !sn || mercek?.sn === sn) return;
        let id = setTimeout(() => setMercek({ sn: sn!, liste: logitMercegi(link!.turkce, sn!) }), 60);
        return () => clearTimeout(id);
    }, [faz, link, sn, mercek]);

    if (!link?.turkce || !sn) return null;
    let m = link.turkce, C = m.config.n_embd, T = sn.T;
    let adim = SIRA.indexOf(faz);
    let baslik = prog.walkthrough.phaseList.flatMap(g => g.phases).find(p => p.id === faz)?.title ?? '';
    let tok = sn.ids.map(id => m.tok.coz([id]));
    let sira = Math.min(2, sn.n - 1);         // anlatımın izlediği parça (gömme, normalizasyon, MLP)
    let son = sn.n - 1;                        // dikkatte sorgulayan ve tahmin yapılan son parça
    let b0 = sn.bloklar[0];

    function odakDegistir() {
        odakAyarla(!odak.acik);
        prog.markDirty();
        yenile(x => x + 1);
    }
    function kutuDegistir(v: boolean) {
        setAcik(v);
        try { window.localStorage.setItem('transformer-3b-durum', v ? '1' : '0'); } catch { /* yok */ }
    }

    let ust = <div className={s.ust}>
        <span className={s.adim}>{adim >= 0 ? `Adım ${adim + 1}/${SIRA.length}` : 'Adım'}</span>
        <span className={s.baslik}>{baslik}</span>
        <label className={s.odak} title="Bölümün konusu olmayan blokları silikleştirir">
            <input type="checkbox" checked={odak.acik} onChange={odakDegistir} /> Odak
        </label>
        <button className={s.kapat} onClick={() => kutuDegistir(!acik)} aria-label={acik ? 'Kutuyu küçült' : 'Kutuyu aç'}>{acik ? '–' : '+'}</button>
    </div>;

    if (!acik) return <div className={clsx(s.kutu, s.kucuk)}>{ust}</div>;

    let icerik: React.ReactNode = null;
    let tahmin = enOlasilar(link, son, 5);

    switch (faz) {
        case Phase.Intro_Intro:
            icerik = <>
                <p className={s.ozet}>Model cümleyi okur ve <b>sıradaki parçayı</b> tahmin eder. Sahnede yukarıdan aşağı akan her şey bu tek tahmin için yapılan hesaptır.</p>
                <div className={s.parcalar}>{tok.map((t, i) => <Parca key={i} t={t} />)}<span className={s.ok}>→</span><Parca t={tahmin[0]?.metin ?? '?'} vurgu alt={tahmin[0] ? yuzde(tahmin[0].p) : ''} /></div>
            </>;
            break;
        case Phase.Intro_Prelim:
            icerik = <>
                <p className={s.ozet}>Metin önce <b>parçalara</b> (token), her parça da sözlükteki <b>numarasına</b> çevrilir. Model yalnızca bu numaraları görür.</p>
                <div className={s.parcalar}>{tok.map((t, i) => <Parca key={i} t={t} alt={String(sn!.ids[i])} />)}</div>
            </>;
            break;
        case Phase.Input_Detail_Embedding:
            icerik = <>
                <p className={s.ozet}><Parca t={tok[sira]} vurgu /> (#{sn.ids[sira]}) için iki sütun alınır ve toplanır. Her sütun {GERCEK.C} sayı; ilk {ADIM_SAYISI}'sı:</p>
                <Vektor ad="token gömmesi" v={tokGomme(m, sn.ids[sira])} tur="agirlik" />
                <Vektor ad={`konum gömmesi (t = ${sira})`} v={m.t.wpe.f32!.subarray(sira * C, (sira + 1) * C)} tur="agirlik" isaret="+" />
                <Vektor ad="girdi gömmesi" v={satir(sn.x0, sira, C)} isaret="=" />
            </>;
            break;
        case Phase.Input_Detail_LayerNorm: {
            let mu = b0.ln1agg[sira * 2], sd = b0.ln1agg[sira * 2 + 1];
            icerik = <>
                <p className={s.ozet}><Parca t={tok[sira]} vurgu /> sütununun {GERCEK.C} sayısının ortalaması ve standart sapması bulunur; her sayıdan ortalama çıkarılıp sapmaya bölünür (sonra γ ile çarpılır, β eklenir).</p>
                <div className={s.formul}>μ = {say(mu, 3)} &nbsp;·&nbsp; σ = {say(sd, 3)}</div>
                <Vektor ad="girdi x" v={satir(sn.x0, sira, C)} />
                <Vektor ad="(x − μ) / σ · γ + β" v={satir(b0.ln1, sira, C)} isaret="→" />
            </>;
            break;
        }
        case Phase.Input_Detail_SelfAttention: {
            let h = 2, sat = h * T * T + son * T;
            let satirlar = tok.slice(0, son + 1).map((t, j) => ({ ad: okunur(t), p: b0.attsm[sat + j], vurgu: j === son }));
            icerik = <>
                <p className={s.ozet}>Son parça <Parca t={tok[son]} vurgu /> kendi <b>sorgusunu</b> (Q) önceki parçaların <b>anahtarlarıyla</b> (K) karşılaştırır; benzerlik softmax ile yüzdeye çevrilir. 1. blok, {h + 1}. baş:</p>
                <Cubuklar satirlar={satirlar} />
                <p className={s.not}>Bu yüzdelerle parçaların <b>değer</b> (V) vektörleri harmanlanır. Diğer {GERCEK.nHeads - 1} baş başka ilişkilere bakar.</p>
            </>;
            break;
        }
        case Phase.Input_Detail_Projection:
            icerik = <>
                <p className={s.ozet}>{GERCEK.nHeads} başın {GERCEK.A}'er sayılık çıktısı alt alta dizilir ({GERCEK.nHeads} × {GERCEK.A} = {GERCEK.C}), bir doğrusal katmandan geçer ve <b>artık yola</b> eklenir:</p>
                <Vektor ad="girdi (artık yol)" v={satir(sn.x0, sira, C)} />
                <Vektor ad="dikkatin katkısı" v={satir(b0.proj, sira, C)} isaret="+" />
                <Vektor ad="yeni artık yol" v={satir(b0.res1, sira, C)} isaret="=" />
            </>;
            break;
        case Phase.Input_Detail_Mlp: {
            let F = 4 * C, g = satir(b0.gelu, sira, F), etkin = 0;
            for (let i = 0; i < F; i++) if (g[i] > 0.1) etkin++;
            icerik = <>
                <p className={s.ozet}><Parca t={tok[sira]} vurgu /> sütunu {GERCEK.C} → {sayiTR(F)} sayıya genişler, GELU'dan geçer ve yeniden {GERCEK.C}'e iner. Bu sütunda {sayiTR(F)} nöronun <b>{sayiTR(etkin)}</b> tanesi (%{Math.round(etkin / F * 100)}) belirgin biçimde etkin.</p>
                <Vektor ad="GELU sonrası" v={g} />
                <Vektor ad="MLP'nin katkısı" v={satir(b0.mproj, sira, C)} isaret="+" />
                <Vektor ad="bloğun çıktısı" v={satir(b0.res2, sira, C)} isaret="=" />
            </>;
            break;
        }
        case Phase.Input_Detail_Transformer: {
            let liste = mercek?.sn === sn ? mercek.liste : null;
            icerik = <>
                <p className={s.ozet}>Aynı blok {GERCEK.nBlocks} kez tekrarlanır{OZET ? ' (sahnede yalnızca 1. blok çizili)' : ''}. Her bloktan sonra modelin <Parca t={tok[son]} vurgu /> için o anki tahminine bakarsak:</p>
                {liste
                    ? <Cubuklar satirlar={liste.map(r => ({ ad: `${r.blok}. blok`, p: r.p, ek: `${okunur(r.metin)} ${yuzde(r.p)}`, vurgu: r.blok === liste!.length }))} />
                    : <p className={s.not}>Hesaplanıyor…</p>}
                <p className={s.not}>İlk bloklarda tahmin bulanık; son bloklara doğru netleşir. (Bu bakışa "logit merceği" denir.)</p>
            </>;
            break;
        }
        case Phase.Input_Detail_Softmax: {
            let V = m.config.vocab_size, o = son * V;
            icerik = <>
                <p className={s.ozet}>Son katman her parça için bir <b>ham puan</b> (logit) üretir. Softmax bunları toplamı 1 olan <b>olasılıklara</b> çevirir: üstelini al, toplama böl.</p>
                <div className={s.tablo}>
                    <span className={s.tbas}>parça</span><span className={s.tbas}>logit</span><span className={s.tbas}>olasılık</span>
                    {tahmin.map(t => <React.Fragment key={t.id}>
                        <span>{okunur(t.metin)}</span><span>{say(sn!.logits[o + t.id])}</span><span>{yuzde(t.p)}</span>
                    </React.Fragment>)}
                </div>
                <p className={s.not}>Puanlar arasındaki küçük farklar, üstel alma yüzünden olasılıkta büyük farka dönüşür.</p>
            </>;
            break;
        }
        case Phase.Input_Detail_Output:
            icerik = <>
                <p className={s.ozet}>Sonuç: <Parca t={tok[son]} vurgu /> parçasından sonra gelebilecek {sayiTR(m.config.vocab_size)} parçanın her birinin olasılığı. En olası beşi:</p>
                <Cubuklar satirlar={tahmin.map((t, i) => ({ ad: okunur(t.metin), p: t.p, vurgu: i === 0 }))} />
                <p className={s.not}>Sağ alttaki panelde bir tahmine tıklayınca parça cümleye eklenir ve bütün hesap yeniden yapılır.</p>
            </>;
            break;
    }

    return <div className={s.kutu}>
        {ust}
        <div className={s.govde}>{icerik}</div>
    </div>;
};

const sayiTR = (n: number) => n.toLocaleString('tr-TR');
