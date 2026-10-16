'use client';
// TR: İnceleme kartının gövdesi: seçili adımda ne olduğunu, o adımın gerçek sayılarıyla anlatır.
import React, { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { ITurkceModel, ISonuc } from '@/src/llm/tr/TurkceModel';
import { L, YEREL } from '@/src/llm/tr/dil';
import { yuzde } from '@/src/hikaye/veri';
import {
    basOzetleri, blokGirdisi, dikkatSatiri, dilim, enBuyukler, gommeSatiri, IMercek, konumSatiri, mlpSatiri, ortSd, qkv,
    sicaklikAdaylari, skorSatiri, uzunluk,
} from './veri';
import s from './kesif.module.scss';

export const gor = (t: string) => t.replace('<|endoftext|>', L('[metin sonu]', '[end of text]')).replace(/\n/g, '¶').trim() || '␣';
const say = (v: number, k = 2) => v.toLocaleString(YEREL, { minimumFractionDigits: k, maximumFractionDigits: k });
const GOSTER = 24; // şeritte gösterilen sayı adedi

/** sayı şeridi: kırmızı artı, mavi eksi; renk şiddeti şeridin kendi en büyük değerine göre */
export const Serit: React.FC<{ ad: React.ReactNode; d: number[]; olcek?: number; not?: React.ReactNode }> = ({ ad, d, olcek, not }) => {
    let mx = olcek ?? Math.max(1e-6, ...d.map(Math.abs));
    return <div className={s.serit}>
        <div className={s.seritAd}><span>{ad}</span>{not && <small>{not}</small>}</div>
        <div className={s.vek}>{d.map((v, k) => {
            let a = Math.min(1, Math.abs(v) / mx);
            return <i key={k} title={say(v, 3)} style={{ background: v >= 0 ? `rgba(225, 29, 72, ${0.1 + 0.85 * a})` : `rgba(47, 84, 235, ${0.1 + 0.85 * a})` }} />;
        })}</div>
    </div>;
};

/** 3.072 nöronluk ızgara (96 × 32) */
const Izgara: React.FC<{ d: ArrayLike<number> }> = ({ d }) => {
    let ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let c = ref.current; if (!c) return;
        let g = c.getContext('2d')!, S = 4, K = 96;
        let mx = 1e-6; for (let i = 0; i < d.length; i++) mx = Math.max(mx, Math.abs(d[i]));
        g.clearRect(0, 0, c.width, c.height);
        for (let i = 0; i < d.length; i++) {
            let v = d[i], a = Math.min(1, Math.abs(v) / (mx * 0.5));
            g.fillStyle = v >= 0 ? `rgba(225, 29, 72, ${0.06 + 0.94 * a})` : `rgba(47, 84, 235, ${0.06 + 0.94 * a})`;
            g.fillRect((i % K) * S, Math.floor(i / K) * S, S - 0.6, S - 0.6);
        }
    }, [d]);
    return <canvas ref={ref} width={384} height={128} className={s.izgara} />;
};

const Aciklama: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className={s.aciklama}>{children}</p>;
const Satir: React.FC<{ a: React.ReactNode; b: React.ReactNode }> = ({ a, b }) => <div className={s.satir}><span>{a}</span><span>{b}</span></div>;

export interface IAsamaKartProps {
    model: ITurkceModel; sonuc: ISonuc; tokenler: string[];
    secili: number; blok: number; bas: number; adim: number;
    sicaklik: number; setSicaklik: (t: number) => void;
    mrc?: IMercek[];
    ekle: (id: number) => void; ornekleEkle: () => void; sinirda: boolean;
    setBas: (h: number) => void;
}

export const AsamaKart: React.FC<IAsamaKartProps> = p => {
    let { model: m, sonuc: sn, tokenler, secili: i, blok: l, bas: h, adim } = p;
    let C = m.config.n_embd, H = m.config.n_head, A = C / H, V = m.config.vocab_size;
    let tok = gor(tokenler[i]), id = sn.ids[i];
    let k = sn.bloklar[l];
    let ilk = (v: number[]) => v.slice(0, GOSTER);

    switch (adim) {
        case 0: return <>
            <Aciklama>{L(`Model kelimeyi görmez; yalnızca sözlükteki numarasını görür. "${tok}" sözlükte #${id}. Bu numara, aşağıdaki her şeyin başlangıcı.`,
                `The model never sees words, only vocabulary ids. "${tok}" is #${id}. Everything below starts from this number.`)}</Aciklama>
            <Satir a={L('Sözlük numarası', 'Vocabulary id')} b={<b>#{id}</b>} />
            <Satir a={L('Sözlük boyu', 'Vocabulary size')} b={V.toLocaleString(YEREL)} />
            <Satir a={L('Cümledeki sırası', 'Position in sentence')} b={`${i + 1} / ${sn.n}`} />
        </>;
        case 1: {
            let g = gommeSatiri(m, id);
            return <>
                <Aciklama>{L(`Gömme tablosu ${V.toLocaleString(YEREL)} satır × ${C} sütun. #${id}. satır okunur: "${tok}" için ${C} sayılık vektör. Bu sayıları kimse yazmadı; eğitimde öğrenildi.`,
                    `The embedding table has ${V.toLocaleString(YEREL)} rows × ${C} columns. Row #${id} is read: a ${C}-number vector for "${tok}". Nobody wrote these numbers; they were learned in training.`)}</Aciklama>
                <Serit ad={L(`Satır #${id}`, `Row #${id}`)} not={L(`ilk ${GOSTER} / ${C}`, `first ${GOSTER} / ${C}`)} d={ilk(g)} />
                <Satir a={L('Vektörün uzunluğu', 'Vector length')} b={say(uzunluk(g))} />
            </>;
        }
        case 2: {
            let g = gommeSatiri(m, id), kn = konumSatiri(m, i), x = dilim(sn.x0, i, C);
            let mx = Math.max(...[...ilk(g), ...ilk(kn), ...ilk(x)].map(Math.abs));
            return <>
                <Aciklama>{L(`Sıra bilgisi eklenir: ${i + 1}. konumun vektörü (ayrı bir tabloda, o da öğrenilmiş) gömmeye toplanır. Aynı kelime başka sırada başka bir vektörle yola çıkar.`,
                    `Order is added: the vector for position ${i + 1} (another learned table) is added to the embedding. The same word at another position starts with a different vector.`)}</Aciklama>
                <Serit ad={L('Gömme', 'Embedding')} d={ilk(g)} olcek={mx} />
                <Serit ad={L(`+ Konum ${i + 1}`, `+ Position ${i + 1}`)} d={ilk(kn)} olcek={mx} />
                <Serit ad={L('= Girdi', '= Input')} d={ilk(x)} olcek={mx} />
            </>;
        }
        case 3: case 10: {
            let ilkNorm = adim === 3;
            let once = ilkNorm ? blokGirdisi(m, sn, l, i) : dilim(k.res1, i, C), sonra = dilim(ilkNorm ? k.ln1 : k.ln2, i, C);
            let a = ortSd(once), b = ortSd(sonra);
            return <>
                <Aciklama>{ilkNorm ? L(`Blok ${l + 1}'e giren vektör önce ölçeklenir: ortalaması 0'a, yayılımı 1'e çekilir, sonra öğrenilmiş ağırlıklarla ayarlanır. Böylece sayılar 12 blok boyunca patlamaz ya da sönmez.`,
                    `The vector entering block ${l + 1} is first rescaled: mean to 0, spread to 1, then adjusted by learned weights. This keeps numbers from exploding or vanishing across 12 blocks.`)
                    : L('Aynı ölçekleme, bu kez MLP\'den önce.', 'The same rescaling, this time before the MLP.')}</Aciklama>
                <Serit ad={L('Önce', 'Before')} d={ilk(once)} not={`${L('ort', 'mean')} ${say(a.ort)} · ${L('yayılım', 'std')} ${say(a.sd)}`} />
                <Serit ad={L('Sonra', 'After')} d={ilk(sonra)} not={`${L('ort', 'mean')} ${say(b.ort)} · ${L('yayılım', 'std')} ${say(b.sd)}`} />
            </>;
        }
        case 4: {
            let { q, k: kk, v } = qkv(m, sn, l, h, i);
            let mx = Math.max(...[...q, ...kk, ...v].map(Math.abs));
            return <>
                <Aciklama>{L(`Normlu vektör üç ayrı öğrenilmiş matrisle çarpılır. Q: "ne arıyorum?", K: "bende ne var?", V: "bana bakılırsa ne veririm?". ${C} sayı ${H} başa bölünür; Baş ${h + 1} kendi ${A}'lık dilimini kullanır.`,
                    `The normed vector is multiplied by three learned matrices. Q: "what am I looking for?", K: "what do I have?", V: "what do I give if attended to?". ${C} numbers are split into ${H} heads; head ${h + 1} uses its own ${A}-number slice.`)}</Aciklama>
                <Serit ad="Q" not={L(`Baş ${h + 1} · ilk ${GOSTER} / ${A}`, `head ${h + 1} · first ${GOSTER} / ${A}`)} d={ilk(q)} olcek={mx} />
                <Serit ad="K" d={ilk(kk)} olcek={mx} />
                <Serit ad="V" d={ilk(v)} olcek={mx} />
                <p className={s.notKucuk}>{L('Önceki her parça da kendi K ve V\'sini çıkardı (sahnede soluk kutular).', 'Every earlier token produced its own K and V too (faint boxes in the scene).')}</p>
            </>;
        }
        case 5: case 6: {
            let skor = skorSatiri(sn, l, h, i), pay = dikkatSatiri(sn, l, h, i);
            let sira = skor.map((v, j) => ({ j, v, p: pay[j] })).sort((a, b) => b.v - a.v).slice(0, 7);
            let { q } = qkv(m, sn, l, h, i);
            let en = sira[0];
            let kEn = qkv(m, sn, l, h, en.j).k;
            let ham = q.reduce((t, v, a) => t + v * kEn[a], 0);
            return <>
                {adim === 5 ? <Aciklama>{L(`"${tok}"un Q'su her önceki parçanın K'sıyla nokta çarpımına girer ve √${A} = ${Math.sqrt(A)}'e bölünür. Skor büyükse uyum büyük. Sonraki parçalara bakılamaz (maske).`,
                    `The Q of "${tok}" is dot-multiplied with each earlier token's K and divided by √${A} = ${Math.sqrt(A)}. Bigger score, better match. Later tokens are masked out.`)}</Aciklama>
                    : <Aciklama>{L('Skorlar softmax\'tan geçer: her biri e üzeri alınıp pozitif yapılır, toplamları 1 olacak şekilde bölünür. Çıkan yüzdeler dikkat payları: sahnedeki yaylar.',
                        'Scores go through softmax: exponentiated to be positive and divided so they sum to 1. The resulting percentages are the attention weights: the arcs in the scene.')}</Aciklama>}
                {adim === 5 && <p className={s.formul}>Q·K({gor(tokenler[en.j])}) = {say(ham)} ÷ {Math.sqrt(A)} = <b>{say(en.v)}</b></p>}
                <table className={s.minTablo}><tbody>
                    {sira.map(r => <tr key={r.j}>
                        <td className={s.mono}>{gor(tokenler[r.j])}{r.j === i ? L(' (kendisi)', ' (itself)') : ''}</td>
                        <td className={s.sag}>{say(r.v)}</td>
                        {adim === 6 && <><td className={s.ok}>→</td>
                            <td className={s.barTd}><i className={s.bar} style={{ width: `${r.p * 100}%` }} /></td>
                            <td className={s.sag}><b>{yuzde(r.p, 0)}</b></td></>}
                    </tr>)}
                </tbody></table>
                <p className={s.notKucuk}>{L(`Sahnede arka arkaya 12 ince plaka = 12 baş. Hepsi aynı anda, birbirinden bağımsız hesaplanır; her birinin kendi Q, K, V'si ve kendi yayları var. Turuncu: Baş ${h + 1} (Blok ${l + 1}). Başka bir başa geçmek için plakasına tıklayın.`,
                    `The 12 thin plates behind each other in the scene = 12 heads. They are computed at the same time, independently; each has its own Q, K, V and its own arcs. Orange: head ${h + 1} (block ${l + 1}). Click a plate to switch head.`)}</p>
            </>;
        }
        case 7: {
            let pay = dikkatSatiri(sn, l, h, i);
            let sira = pay.map((p, j) => ({ j, p })).sort((a, b) => b.p - a.p).slice(0, 3);
            let cikti = dilim(k.vout, i, C, h * A, A);
            let mx = Math.max(...cikti.map(Math.abs), ...sira.flatMap(r => qkv(m, sn, l, h, r.j).v.slice(0, GOSTER).map(Math.abs)));
            return <>
                <Aciklama>{L(`Her önceki parçanın V'si, payı kadar alınıp toplanır. "${tok}" bu başta en çok "${gor(tokenler[sira[0].j])}" parçasından bilgi alır.`,
                    `Each earlier token's V is scaled by its weight and summed. In this head "${tok}" takes the most from "${gor(tokenler[sira[0].j])}".`)}</Aciklama>
                {sira.map(r => <Serit key={r.j} ad={<>{yuzde(r.p, 0)} × V({gor(tokenler[r.j])})</>} d={qkv(m, sn, l, h, r.j).v.slice(0, GOSTER)} olcek={mx} />)}
                <Serit ad={L('= Baş çıktısı', '= Head output')} not={`${A} ${L('sayı', 'numbers')}`} d={ilk(cikti)} olcek={mx} />
            </>;
        }
        case 8: {
            let oz = basOzetleri(sn, l, i, H);
            return <>
                <Aciklama>{L(`${H} başın her biri farklı bir şeye baktı. Çıktıları yan yana konur (${H} × ${A} = ${C}) ve öğrenilmiş bir matrisle karıştırılır.`,
                    `Each of the ${H} heads looked at something different. Their outputs are concatenated (${H} × ${A} = ${C}) and mixed by a learned matrix.`)}</Aciklama>
                <div className={s.baslar}>{oz.map(o => <button key={o.bas} className={clsx(o.bas === h && s.basSecili)} onClick={() => p.setBas(o.bas)}>
                    <small>{L('Baş', 'H')} {o.bas + 1}</small><b>{gor(tokenler[o.hedef])}</b><small>{yuzde(o.pay, 0)}</small>
                </button>)}</div>
                <p className={s.notKucuk}>{L('Sahnede 12 başın çizgileri tek plakada buluşuyor. Bir karta tıklayınca o baş seçilir.', 'In the scene the lines of the 12 heads meet in one plate. Click a card to select that head.')}</p>
                <Serit ad={L('Karışım (proj)', 'Mixed (proj)')} not={L(`ilk ${GOSTER} / ${C}`, `first ${GOSTER} / ${C}`)} d={ilk(dilim(k.proj, i, C))} />
            </>;
        }
        case 9: case 14: {
            let bir = adim === 9;
            let once = bir ? blokGirdisi(m, sn, l, i) : dilim(k.res1, i, C);
            let ek = dilim(bir ? k.proj : k.mproj, i, C), sonra = dilim(bir ? k.res1 : k.res2, i, C);
            let mx = Math.max(...[...ilk(once), ...ilk(ek), ...ilk(sonra)].map(Math.abs));
            let oran = uzunluk(ek) / uzunluk(once);
            return <>
                <Aciklama>{bir ? L('Dikkatin sonucu vektörün üstüne eklenir; eski bilgi silinmez, üstüne yazılır. Bu "artık yol" sayesinde bilgi 12 blok boyunca taşınır.',
                    'The attention result is added on top of the vector; old information is kept, not replaced. This "residual stream" carries information through all 12 blocks.')
                    : l < m.config.n_layer - 1 ? L(`MLP'nin sonucu da eklenir. Blok ${l + 1} bitti; vektör Blok ${l + 2}'ye geçer ve aynı 12 adım tekrarlanır.`, `The MLP result is added too. Block ${l + 1} is done; the vector moves to block ${l + 2} and the same 12 steps repeat.`)
                        : L('MLP\'nin sonucu da eklenir. Son blok bitti; vektör çıkışa gider.', 'The MLP result is added too. The last block is done; the vector goes to the output.')}</Aciklama>
                <Serit ad={L('Önce', 'Before')} d={ilk(once)} olcek={mx} />
                <Serit ad={bir ? L('+ Dikkat', '+ Attention') : '+ MLP'} d={ilk(ek)} olcek={mx} />
                <Serit ad={L('= Sonra', '= After')} d={ilk(sonra)} olcek={mx} />
                <Satir a={L('Eklenenin büyüklüğü', 'Size of what was added')} b={L(`girdinin %${Math.round(oran * 100)}'i`, `${Math.round(oran * 100)}% of the input`)} />
                {!bir && <Satir a={L(`Blok ${l + 1} sonrası tahmin`, `Prediction after block ${l + 1}`)} b={p.mrc ? <><b>{gor(p.mrc[l].metin)}</b> {yuzde(p.mrc[l].p, 0)}</> : '…'} />}
            </>;
        }
        case 11: case 12: {
            let gelu = adim === 12;
            let d = mlpSatiri(m, sn, l, i, gelu), en = enBuyukler(d, 5);
            let acik = 0; for (let j = 0; j < d.length; j++) if (d[j] > 0.5) acik++;
            let negatif = 0; for (let j = 0; j < d.length; j++) if (d[j] < 0) negatif++;
            return <>
                <Aciklama>{gelu ? L(`GELU: negatif değerler sıfıra yakın bastırılır, pozitifler geçer. ${(4 * C).toLocaleString(YEREL)} nörondan yalnızca ${acik} tanesi belirgin açık (> 0,5). Her nöron bir örüntüye tepki veren bir dedektör gibi.`,
                    `GELU: negatives are squashed toward zero, positives pass. Of ${(4 * C).toLocaleString(YEREL)} neurons only ${acik} are clearly on (> 0.5). Each neuron acts like a detector for some pattern.`)
                    : L(`${C} sayı öğrenilmiş bir matrisle ${(4 * C).toLocaleString(YEREL)} nörona açılır (4 kat). Şu an nöronların ${negatif.toLocaleString(YEREL)} tanesi negatif.`,
                        `${C} numbers are expanded by a learned matrix into ${(4 * C).toLocaleString(YEREL)} neurons (4×). Right now ${negatif.toLocaleString(YEREL)} of them are negative.`)}</Aciklama>
                <Izgara d={d} />
                <p className={s.notKucuk}>{L(`${(4 * C).toLocaleString(YEREL)} nöronun hepsi (96 × 32). Kırmızı artı, mavi eksi.`, `All ${(4 * C).toLocaleString(YEREL)} neurons (96 × 32). Red positive, blue negative.`)}</p>
                <Satir a={L('En güçlü nöronlar', 'Strongest neurons')} b={en.map(e => `#${e.j} ${say(e.v, 1)}`).join(' · ')} />
            </>;
        }
        case 13: return <>
            <Aciklama>{L(`Açık nöronların katkıları başka bir öğrenilmiş matrisle toplanıp tekrar ${C} sayıya indirilir. MLP, dikkatin topladığı bilgiyi işleyen adım; modelin "bilgisinin" büyük kısmı bu matrislerde.`,
                `The active neurons' contributions are summed back into ${C} numbers by another learned matrix. The MLP processes what attention gathered; much of the model's "knowledge" lives in these matrices.`)}</Aciklama>
            <Serit ad="MLP" not={L(`ilk ${GOSTER} / ${C}`, `first ${GOSTER} / ${C}`)} d={ilk(dilim(k.mproj, i, C))} />
        </>;
        case 15: {
            let son = dilim(sn.bloklar[m.config.n_layer - 1].res2, i, C), n2 = dilim(sn.lnf, i, C);
            return <>
                <Aciklama>{L('12 blok bitti. Vektör son bir kez ölçeklenir. Artık bu 768 sayı "sıradaki parça ne olmalı?" sorusunun cevabını taşıyor.',
                    'All 12 blocks are done. The vector is rescaled one last time. These 768 numbers now carry the answer to "what should the next token be?".')}</Aciklama>
                <Serit ad={L('Blok 12 çıktısı', 'Block 12 output')} d={ilk(son)} />
                <Serit ad={L('Son norm', 'Final norm')} d={ilk(n2)} />
            </>;
        }
        case 16: {
            let lg = sn.logits.subarray(i * V, (i + 1) * V), en = enBuyukler(lg, 6);
            let enK = Infinity, enKj = 0; for (let j = 0; j < V; j++) if (lg[j] < enK) { enK = lg[j]; enKj = j; }
            return <>
                <Aciklama>{L(`Vektör, gömme tablosunun kendisiyle çarpılır (girişteki aynı tablo): her sözlük parçası için bir puan, toplam ${V.toLocaleString(YEREL)} puan. Puan büyükse o parça vektöre daha çok benziyor.`,
                    `The vector is multiplied by the embedding table itself (the same table as at the input): one score per vocabulary token, ${V.toLocaleString(YEREL)} scores. A higher score means the token matches the vector better.`)}</Aciklama>
                <table className={s.minTablo}><tbody>
                    {en.map(e => <tr key={e.j}><td className={s.mono}>{gor(m.tok.coz([e.j]))}</td><td className={s.soluk}>#{e.j}</td><td className={s.sag}><b>{say(e.v, 1)}</b></td></tr>)}
                    <tr><td className={s.soluk}>…</td><td /><td /></tr>
                    <tr><td className={s.mono}>{gor(m.tok.coz([enKj]))}</td><td className={s.soluk}>{L('en düşük', 'lowest')}</td><td className={s.sag}>{say(enK, 1)}</td></tr>
                </tbody></table>
            </>;
        }
        case 17: case 18: return <Cikis {...p} />;
    }
    return null;
};

const Cikis: React.FC<IAsamaKartProps> = p => {
    let { model: m, sonuc: sn, secili: i, adim, sicaklik: T } = p;
    let ady = useMemo(() => sicaklikAdaylari(m, sn, i, T, 8), [m, sn, i, T]);
    let mx = ady[0]?.p ?? 1;
    return <>
        {adim === 17 ? <Aciklama>{L('Puanlar sıcaklığa bölünür, sonra softmax ile olasılığa çevrilir. Düşük sıcaklık: en yüksek puan öne fırlar. Yüksek sıcaklık: olasılıklar düzleşir.',
            'Scores are divided by the temperature, then softmax turns them into probabilities. Low temperature: the top score dominates. High temperature: probabilities flatten.')}</Aciklama>
            : <Aciklama>{L('Bir parça seçilir ve cümleye eklenir. Sonra her şey baştan: yeni dizi aynı 19 adımdan geçer. Model metni böyle, parça parça üretir.',
                'A token is chosen and appended. Then everything starts again: the new sequence goes through the same 19 steps. This is how the model writes, one token at a time.')}</Aciklama>}
        <label className={s.sicaklik}>{L('Sıcaklık', 'Temperature')} <b>{T.toLocaleString(YEREL, { minimumFractionDigits: 1 })}</b>
            <input type="range" min={0.1} max={2} step={0.1} value={T} onChange={e => p.setSicaklik(+e.target.value)} /></label>
        <table className={s.minTablo}><tbody>
            {ady.map((a, k) => <tr key={a.id} className={clsx(adim === 18 && s.tiklanir)} onClick={adim === 18 && !p.sinirda ? () => p.ekle(a.id) : undefined}>
                <td className={s.mono}>{gor(a.metin)}</td>
                <td className={s.barTd}><i className={s.bar} style={{ width: `${(a.p / mx) * 100}%`, background: k === 0 ? '#E11D48' : '#AEB7F5' }} /></td>
                <td className={s.sag}><b>{yuzde(a.p, 1)}</b></td>
                {adim === 18 && <td className={s.ekleTd}>＋</td>}
            </tr>)}
        </tbody></table>
        {adim === 18 && <div className={s.uretDugmeler}>
            <button className={s.dugmeAna} disabled={p.sinirda} onClick={() => ady[0] && p.ekle(ady[0].id)}>{L('＋ En olasıyı ekle', '＋ Add most likely')}</button>
            <button className={s.dugmeIkinci} disabled={p.sinirda} onClick={p.ornekleEkle}>{L('Sıcaklıkla örnekle', 'Sample at temperature')}</button>
        </div>}
    </>;
};
