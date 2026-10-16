'use client';
// TR: Mimari haritası: GPT-2'nin akış şeması (llm-viz'in "içindekiler" çizimine benzer biçimde): girdi parçaları →
// token gömme ⊕ konum gömme → transformer bloğu (katman normu → öz dikkat ⊕ artık → katman normu → MLP ⊕ artık) × 12
// → katman normu → doğrusal → softmax → tahmin. Şu an çalışan parça kırmızı ışıkla yanar; bir parçaya tıklayınca
// ilgili adıma gidilir. Anlatım ve ayrıntılı görünüm aynı çizimi kendi adım eşlemesiyle kullanır.
import React from 'react';
import clsx from 'clsx';
import s from './hikaye.module.scss';
import { L as dl, MODEL_ADI } from '../llm/tr/dil';

type Dugum = 'metin' | 'parca' | 'gomme' | 'blok' | 'ln1' | 'dikkat' | 'qkv' | 'puan' | 'maske' | 'sm' | 'av' | 'wo' | 'art1' | 'ln2' | 'mlp' | 'art2' | 'lnf' | 'cikti' | 'olasilik' | 'secim';

// adım → yanan düğümler; düğüm → tıklanınca gidilecek adım
const ESLEME: Record<'anlatim' | 'ayrinti', { yanan: Dugum[][]; git: Partial<Record<Dugum, number>> }> = {
    anlatim: {
        yanan: [['metin'], ['parca'], ['gomme'], ['ln1'], ['dikkat', 'sm'], ['av', 'art1'], ['ln2', 'mlp', 'art2'], ['blok'], ['lnf', 'cikti', 'olasilik'], ['secim']],
        git: { metin: 0, parca: 1, gomme: 2, ln1: 3, dikkat: 4, sm: 4, av: 5, art1: 5, ln2: 6, mlp: 6, art2: 6, blok: 7, lnf: 8, cikti: 8, olasilik: 8, secim: 9 },
    },
    ayrinti: {
        yanan: [['gomme', 'blok'], ['ln1'], ['qkv'], ['puan'], ['maske'], ['sm'], ['av'], ['wo', 'art1'], ['ln2', 'mlp', 'art2'], ['blok'], ['lnf', 'cikti'], ['olasilik']],
        git: { gomme: 0, ln1: 1, qkv: 2, dikkat: 2, puan: 3, maske: 4, sm: 5, av: 6, wo: 7, art1: 7, ln2: 8, mlp: 8, art2: 8, blok: 9, lnf: 10, cikti: 10, olasilik: 11 },
    },
};

// llm-viz'deki renk ailesi, koyu sahneye uyarlanmış
const RENK = {
    gomme: '#a78bfa', konum: '#c4b5fd', ln: '#c6dc4a', dikkat: '#e0b179', mlp: '#3fd0e0', dogrusal: '#6c8cff', softmax: '#34d399',
    cizgi: 'rgba(200, 210, 255, 0.55)', blok: 'rgba(170, 180, 220, 0.5)', yazi: '#eef1ff', ikincil: '#9aa6d6', kirmizi: '#ff3b5c', sari: '#ffd38a',
};

const W = 224;          // çizim genişliği (viewBox)
const CX = 92;          // ana akış hattı
const KW = 128;         // kutu genişliği
const AX = 168;         // artık bağlantı hattı (sağda)
const DX = 210;         // çıktı dönüş hattı (en sağda)

const kisalt = (t: string, n: number) => t.length > n ? t.slice(0, n - 1) + '…' : t;
const genislik = (t: string, px: number) => t.length * px * 0.56;

export const Mimari: React.FC<{
    mod: 'anlatim' | 'ayrinti'; adim: number; katman: number; bas: number; L: number; H: number;
    tokenler: string[]; tahmin: { metin: string; p: number }[];
    acik: boolean; setAcik: (a: boolean) => void; git: (k: number) => void; anahtar: React.ReactNode;
}> = ({ mod, adim, katman, bas, L, H, tokenler, tahmin, acik, setAcik, git, anahtar }) => {
    let e = ESLEME[mod];
    let yanan = new Set(e.yanan[adim] ?? []);
    let ayr = mod === 'ayrinti';
    let yaniyor = (...id: Dugum[]) => id.some(i => yanan.has(i));

    // tıklanabilir parça
    let Tik: React.FC<{ id: Dugum; ad: string; children: React.ReactNode }> = ({ id, ad, children }) => {
        let hedef = e.git[id];
        if (hedef === undefined) return <g>{children}</g>;
        return <g className={s.svgTik} role="button" tabIndex={0} aria-label={dl(`${ad}: ${hedef + 1}. adıma git`, `${ad}: go to step ${hedef + 1}`)}
            onClick={ev => { ev.stopPropagation(); git(hedef!); }}
            onKeyDown={ev => { if (ev.key === 'Enter') { ev.stopPropagation(); git(hedef!); } }}>
            <title>{dl(`${ad} · ${hedef + 1}. adıma git`, `${ad} · go to step ${hedef + 1}`)}</title>{children}</g>;
    };
    // renkli kutu
    let Kutu: React.FC<{ id: Dugum; y: number; h: number; renk: string; yazi: string; alt?: string; x?: number; w?: number; yan?: boolean; ebeveyn?: boolean }> =
        ({ id, y, h, renk, yazi, alt, x = CX - KW / 2, w = KW, yan, ebeveyn }) =>
            <Tik id={id} ad={yazi}>
                <rect x={x} y={y} width={w} height={h} rx={3.5} fill={renk} fillOpacity={yan ? 0.42 : 0.2}
                    stroke={yan ? RENK.kirmizi : ebeveyn ? 'rgba(255, 59, 92, 0.7)' : renk} strokeOpacity={yan || ebeveyn ? 1 : 0.75}
                    strokeWidth={yan ? 1.6 : 1} filter={yan ? 'url(#mimariParilti)' : undefined} />
                <text x={x + w / 2} y={alt ? y + h / 2 - 1.5 : y + h / 2 + 3} textAnchor="middle" fontSize={8.6} fontWeight={yan ? 700 : 600} fill={RENK.yazi}>{yazi}</text>
                {alt && <text x={x + w / 2} y={y + h / 2 + 7.5} textAnchor="middle" fontSize={7.2} fill={yan ? '#fff' : RENK.ikincil}>{alt}</text>}
            </Tik>;
    let Topla: React.FC<{ id: Dugum; y: number; ad: string }> = ({ id, y, ad }) => {
        let yan = yanan.has(id);
        return <Tik id={id} ad={ad}>
            <circle cx={CX} cy={y} r={5.5} fill="#0b1024" stroke={yan ? RENK.kirmizi : RENK.cizgi} strokeWidth={yan ? 1.6 : 1}
                filter={yan ? 'url(#mimariParilti)' : undefined} />
            <path d={`M${CX - 3} ${y}H${CX + 3}M${CX} ${y - 3}V${y + 3}`} stroke={yan ? '#fff' : RENK.yazi} strokeWidth={1.1} />
        </Tik>;
    };
    let ok = (x1: number, y1: number, x2: number, y2: number, renk = RENK.cizgi) =>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={renk} strokeWidth={1} markerEnd="url(#mimariOk)" />;

    // ---- yerleşim (yukarıdan aşağıya) ----
    let parcalar: React.ReactNode[] = [];
    let y = 0;

    // girdi parçaları (son parçalar; izlenen parça kırmızı) + sağ üstte tahmin kutusu
    let satirW = 146, xs: { t: string; w: number }[] = [], top = 0;
    for (let i = tokenler.length - 1; i >= 0; i--) {
        let t = kisalt(tokenler[i].replace(/^ /, '').replace(/\n/g, '↵') || '·', 9), w = genislik(t, 7.4) + 6;
        if (top + w + 2 > satirW - 14 && xs.length) { xs.unshift({ t: '…', w: 10 }); break; }
        xs.unshift({ t, w }); top += w + 2;
    }
    let tx = 4, ty = 14;
    let girdiYanar = yaniyor('metin', 'parca');
    parcalar.push(<Tik key="girdi" id={ayr ? 'gomme' : 'parca'} ad={dl('Girdi parçaları', 'Input tokens')}>
        <text x={4} y={8} fontSize={7.4} fill={RENK.ikincil} fontWeight={600}>{dl('girdi parçaları', 'input tokens')}</text>
        {xs.map((p, i) => {
            let son = i === xs.length - 1, x = tx; tx += p.w + 2;
            return <g key={i}>
                <rect x={x} y={ty} width={p.w} height={13} rx={2.5} fill={son ? 'rgba(255, 59, 92, 0.25)' : 'rgba(255,255,255,0.06)'}
                    stroke={son ? RENK.kirmizi : girdiYanar ? 'rgba(255, 59, 92, 0.7)' : 'rgba(170,180,230,0.35)'} strokeWidth={son || girdiYanar ? 1.2 : 0.8}
                    filter={girdiYanar ? 'url(#mimariParilti)' : undefined} />
                <text x={x + p.w / 2} y={ty + 9.3} textAnchor="middle" fontSize={7.4} fill={RENK.yazi}>{p.t}</text>
            </g>;
        })}
    </Tik>);
    // tahmin kutusu
    let tahX = 156, tahW = W - tahX - 2, tahH = 12 + Math.min(3, tahmin.length) * 10 + 3;
    let tahYan = yaniyor('secim');
    parcalar.push(<Tik key="tahmin" id="secim" ad={dl('Tahmin', 'Prediction')}>
        <rect x={tahX} y={2} width={tahW} height={tahH} rx={3.5} fill="rgba(52, 211, 153, 0.12)"
            stroke={tahYan ? RENK.kirmizi : 'rgba(52, 211, 153, 0.6)'} strokeWidth={tahYan ? 1.6 : 1} filter={tahYan ? 'url(#mimariParilti)' : undefined} />
        <text x={tahX + 4} y={10.5} fontSize={7.2} fill={RENK.ikincil} fontWeight={600}>{dl('sonraki parça', 'next token')}</text>
        {tahmin.slice(0, 3).map((t, i) => <g key={i}>
            <text x={tahX + 4} y={21 + i * 10} fontSize={7.4} fill={i === 0 ? '#fff' : RENK.yazi} fontWeight={i === 0 ? 700 : 400}>{kisalt(t.metin.replace(/^ /, '').replace(/\n/g, '↵') || '·', 8)}</text>
            <text x={tahX + tahW - 4} y={21 + i * 10} fontSize={7.2} textAnchor="end" fill={RENK.sari}>{Math.round(t.p * 100)}%</text>
        </g>)}
    </Tik>);
    y = ty + 13;

    // dil modeli çerçevesi başlangıcı
    let cerceveY = Math.max(y + 10, tahH + 8);
    y = cerceveY + 14;
    parcalar.push(<g key="ok0">{ok(CX, ty + 13, CX, y - 1)}</g>);

    // gömme: token gömme ⊕ konum gömme
    let gommeYan = yanan.has('gomme');
    parcalar.push(<Kutu key="tg" id="gomme" y={y} h={15} renk={RENK.gomme} yazi={dl('token gömme', 'token embedding')} yan={gommeYan} />);
    y += 15;
    let topY = y + 12;
    parcalar.push(<g key="ok1">{ok(CX, y, CX, topY - 6)}</g>);
    parcalar.push(<Tik key="konum" id="gomme" ad={dl('Konum gömme', 'Position embedding')}>
        <line x1={CX + 6} y1={topY} x2={132} y2={topY} stroke={RENK.cizgi} strokeWidth={1} />
        <circle cx={139} cy={topY} r={7} fill={RENK.konum} fillOpacity={gommeYan ? 0.4 : 0.18} stroke={gommeYan ? RENK.kirmizi : RENK.konum}
            strokeWidth={gommeYan ? 1.5 : 1} filter={gommeYan ? 'url(#mimariParilti)' : undefined} />
        <text x={139} y={topY + 3} textAnchor="middle" fontSize={9} fill={RENK.yazi}>~</text>
        <text x={149} y={topY - 1} fontSize={7.4} fill={RENK.ikincil}>{dl('konum', 'position')}</text>
        <text x={149} y={topY + 7} fontSize={7.4} fill={RENK.ikincil}>{dl('gömme', 'embed.')}</text>
    </Tik>);
    parcalar.push(<Topla key="t0" id="gomme" y={topY} ad={dl('Gömmelerin toplamı', 'Sum of embeddings')} />);
    y = topY + 6;

    // transformer bloğu
    let blokY = y + 10;
    parcalar.push(<g key="ok2">{ok(CX, y, CX, blokY + 13)}</g>);
    y = blokY + 18;
    let ic: React.ReactNode[] = [];
    // artık 1: ayrılma noktası
    let ayr1 = y + 2;
    y = ayr1 + 5;
    ic.push(<Kutu key="ln1" id="ln1" y={y} h={14} renk={RENK.ln} yazi={dl('katman normu', 'layer norm')} yan={yanan.has('ln1')} w={100} x={CX - 50} />);
    y += 14;
    // Q K V okları
    let qkvYan = yanan.has('qkv');
    ic.push(<g key="qkv">{[-22, 0, 22].map((d, i) => <g key={i}>{ok(CX + d, y, CX + d, y + 12, qkvYan ? RENK.kirmizi : RENK.cizgi)}
        <text x={CX + d + 3} y={y + 8} fontSize={7} fill={qkvYan ? '#fff' : RENK.ikincil}>{'QKV'[i]}</text></g>)}</g>);
    y += 13;
    // öz dikkat kutusu (+ alt adımlar)
    let cipler: { id: Dugum; t: string }[] = ayr
        ? [{ id: 'qkv', t: 'Q K V' }, { id: 'puan', t: 'Q·Kᵀ/√64' }, { id: 'maske', t: dl('maske', 'mask') }, { id: 'sm', t: 'softmax' }, { id: 'av', t: 'A·V' }, { id: 'wo', t: 'W_O' }]
        : [{ id: 'sm', t: dl('kime bakılır?', 'who to look at?') }, { id: 'av', t: dl('bilgi taşınır', 'info moves') }];
    let sutun = ayr ? 3 : 2, cw = (KW - 8 - (sutun - 1) * 3) / sutun, satir = Math.ceil(cipler.length / sutun);
    let dkY = y, dkH = 25 + satir * 13 + 3;
    let dkYan = yanan.has('dikkat'), dkEbeveyn = cipler.some(c => yanan.has(c.id));
    ic.push(<g key="dikkat">
        <Tik id="dikkat" ad={dl('Çok başlı, nedensel öz dikkat', 'Multi-head causal self-attention')}>
            <rect x={CX - KW / 2} y={dkY} width={KW} height={dkH} rx={4} fill={RENK.dikkat} fillOpacity={dkYan ? 0.36 : 0.16}
                stroke={dkYan ? RENK.kirmizi : dkEbeveyn ? 'rgba(255, 59, 92, 0.7)' : RENK.dikkat} strokeOpacity={dkYan || dkEbeveyn ? 1 : 0.75}
                strokeWidth={dkYan ? 1.6 : 1} filter={dkYan ? 'url(#mimariParilti)' : undefined} />
            <text x={CX} y={dkY + 10.5} textAnchor="middle" fontSize={8.4} fontWeight={dkYan ? 700 : 600} fill={RENK.yazi}>{dl('çok başlı, nedensel öz dikkat', 'multi-head causal self-attention')}</text>
            <text x={CX} y={dkY + 20} textAnchor="middle" fontSize={7.2} fill={RENK.sari} fontWeight={600}>{ayr ? dl(`baş ${bas + 1}/${H} gösteriliyor`, `showing head ${bas + 1}/${H}`) : dl(`${H} baş paralel çalışır`, `${H} heads in parallel`)}</text>
        </Tik>
        {cipler.map((c, i) => {
            let x = CX - KW / 2 + 4 + (i % sutun) * (cw + 3), cy = dkY + 24 + Math.floor(i / sutun) * 13, yan = yanan.has(c.id);
            return <Tik key={c.id} id={c.id} ad={c.t}>
                <rect x={x} y={cy} width={cw} height={11} rx={2.5} fill={yan ? 'rgba(255, 59, 92, 0.35)' : 'rgba(10, 14, 32, 0.55)'}
                    stroke={yan ? RENK.kirmizi : 'rgba(224, 177, 121, 0.5)'} strokeWidth={yan ? 1.3 : 0.8} filter={yan ? 'url(#mimariParilti)' : undefined} />
                <text x={x + cw / 2} y={cy + 8} textAnchor="middle" fontSize={7} fill={yan ? '#fff' : RENK.yazi} fontWeight={yan ? 700 : 400}>{c.t}</text>
            </Tik>;
        })}
    </g>);
    y = dkY + dkH;
    let t1 = y + 11;
    ic.push(<g key="ok3">{ok(CX, y, CX, t1 - 6)}</g>);
    // artık bağlantı 1
    let a1Yan = yanan.has('art1');
    ic.push(<path key="art1" d={`M${CX} ${ayr1}H${AX}V${t1}H${CX + 6}`} fill="none" stroke={a1Yan ? RENK.kirmizi : RENK.cizgi} strokeWidth={a1Yan ? 1.4 : 1}
        markerEnd="url(#mimariOk)" filter={a1Yan ? 'url(#mimariParilti)' : undefined} />);
    ic.push(<circle key="ad1" cx={CX} cy={ayr1} r={1.8} fill={RENK.yazi} />);
    ic.push(<text key="art1y" x={AX - 8} y={(ayr1 + t1) / 2} fontSize={7} fill={a1Yan ? '#fff' : RENK.ikincil} transform={`rotate(90 ${AX - 8} ${(ayr1 + t1) / 2})`} textAnchor="middle">{dl('artık bağlantı', 'residual')}</text>);
    ic.push(<Topla key="t1" id="art1" y={t1} ad={dl('Artık bağlantı (toplama)', 'Residual connection (add)')} />);
    y = t1 + 6;
    // ikinci yarı: katman normu → MLP
    let ayr2 = y + 4;
    y = ayr2 + 5;
    ic.push(<g key="ok4">{ok(CX, t1 + 5.5, CX, y - 1)}</g>);
    ic.push(<Kutu key="ln2" id="ln2" y={y} h={14} renk={RENK.ln} yazi={dl('katman normu', 'layer norm')} yan={yanan.has('ln2')} w={100} x={CX - 50} />);
    y += 14;
    ic.push(<g key="ok5">{ok(CX, y, CX, y + 8)}</g>);
    y += 9;
    ic.push(<Kutu key="mlp" id="mlp" y={y} h={23} renk={RENK.mlp} yazi={dl('ileri beslemeli (MLP)', 'feed-forward (MLP)')} alt="W₁ → GELU → W₂" yan={yanan.has('mlp')} />);
    y += 23;
    let t2 = y + 11;
    ic.push(<g key="ok6">{ok(CX, y, CX, t2 - 6)}</g>);
    let a2Yan = yanan.has('art2');
    ic.push(<path key="art2" d={`M${CX} ${ayr2}H${AX}V${t2}H${CX + 6}`} fill="none" stroke={a2Yan ? RENK.kirmizi : RENK.cizgi} strokeWidth={a2Yan ? 1.4 : 1}
        markerEnd="url(#mimariOk)" filter={a2Yan ? 'url(#mimariParilti)' : undefined} />);
    ic.push(<circle key="ad2" cx={CX} cy={ayr2} r={1.8} fill={RENK.yazi} />);
    ic.push(<Topla key="t2" id="art2" y={t2} ad={dl('Artık bağlantı (toplama)', 'Residual connection (add)')} />);
    y = t2 + 6;
    let blokSon = y + 4;
    let blokYan = yanan.has('blok');
    let bx = CX - KW / 2 - 9, bw = AX + 10 - bx;
    parcalar.push(<g key="blok">
        {/* × 12: arkadaki kopyalar */}
        <rect x={bx + 6} y={blokY + 6} width={bw} height={blokSon - blokY} rx={6} fill="rgba(120, 130, 170, 0.06)" stroke={RENK.blok} strokeOpacity={0.35} />
        <rect x={bx + 3} y={blokY + 3} width={bw} height={blokSon - blokY} rx={6} fill="rgba(120, 130, 170, 0.06)" stroke={RENK.blok} strokeOpacity={0.55} />
        <Tik id="blok" ad={dl(`Transformer bloğu (× ${L})`, `Transformer block (× ${L})`)}>
            <rect x={bx} y={blokY} width={bw} height={blokSon - blokY} rx={6} fill="#141a33" fillOpacity={0.92}
                stroke={blokYan ? RENK.kirmizi : RENK.blok} strokeWidth={blokYan ? 1.7 : 1.1} filter={blokYan ? 'url(#mimariParilti)' : undefined} />
            <text x={bx + 6} y={blokY + 11} fontSize={8.2} fontWeight={700} fill={RENK.yazi}>{dl('transformer bloğu', 'transformer block')} {ayr ? `${katman + 1}/${L}` : ''}</text>
            <text x={bx + bw - 6} y={blokY + 11} fontSize={8.2} fontWeight={700} fill={RENK.sari} textAnchor="end">× {L}</text>
        </Tik>
        {ic}
    </g>);
    y = blokSon;

    // çıkış: katman normu → doğrusal → softmax
    y += 9;
    parcalar.push(<g key="ok7">{ok(CX, t2 + 5.5, CX, y - 1)}</g>);
    parcalar.push(<Kutu key="lnf" id="lnf" y={y} h={14} renk={RENK.ln} yazi={dl('katman normu', 'layer norm')} yan={yanan.has('lnf')} w={100} x={CX - 50} />);
    y += 14;
    parcalar.push(<g key="ok8">{ok(CX, y, CX, y + 8)}</g>);
    y += 9;
    parcalar.push(<Kutu key="dog" id="cikti" y={y} h={21} renk={RENK.dogrusal} yazi={dl('doğrusal', 'linear')} alt="h · Eᵀ → logit" yan={yanan.has('cikti')} />);
    y += 21;
    parcalar.push(<g key="ok9">{ok(CX, y, CX, y + 8)}</g>);
    y += 9;
    parcalar.push(<Kutu key="sm" id="olasilik" y={y} h={ayr ? 21 : 15} renk={RENK.softmax} yazi="softmax" alt={ayr ? dl('sıcaklık T ile', 'with temperature T') : undefined} yan={yanan.has('olasilik')} />);
    y += ayr ? 21 : 15;
    // çıktı hattı: aşağı → sağa → yukarı, tahmin kutusuna
    let donY = y + 9, donYan = yaniyor('olasilik', 'secim');
    parcalar.push(<path key="don" d={`M${CX} ${y}V${donY}H${DX}V${tahH + 4}`} fill="none" stroke={donYan ? RENK.kirmizi : RENK.softmax} strokeOpacity={donYan ? 1 : 0.7}
        strokeWidth={donYan ? 1.4 : 1} markerEnd="url(#mimariOkYesil)" />);
    let cerceveSon = donY + 7;
    parcalar.unshift(<g key="cerceve">
        <rect x={2} y={cerceveY} width={AX + 19} height={cerceveSon - cerceveY} rx={7} fill="none" stroke="rgba(170, 180, 230, 0.4)" strokeDasharray="3 3" />
        <text x={8} y={cerceveY + 10} fontSize={7.4} fill={RENK.ikincil} fontWeight={700}>{dl('Dil modeli', 'Language model')} · {MODEL_ADI}</text>
    </g>);
    let H_ = cerceveSon + 3;

    return <aside className={clsx(s.mimari, !acik && s.mimariKapali)} aria-label={dl('Mimari haritası', 'Architecture map')}>
        <button className={s.mimariUst} onClick={() => setAcik(!acik)}>
            <span>{dl('Mimari · nerede?', 'Architecture · where?')}</span><span>{acik ? '–' : '+'}</span>
        </button>
        {acik && <>
            <svg className={s.mimariSvg} viewBox={`0 0 ${W} ${H_}`} width="100%" role="img" aria-label={dl('GPT-2 akış şeması', 'GPT-2 flow diagram')}>
                <defs>
                    <filter id="mimariParilti" x="-30%" y="-60%" width="160%" height="220%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b" />
                        <feFlood floodColor="#ff3b5c" floodOpacity="0.85" />
                        <feComposite in2="b" operator="in" />
                        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <marker id="mimariOk" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
                        <path d="M0 0L6 3L0 6z" fill={RENK.cizgi} />
                    </marker>
                    <marker id="mimariOkYesil" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
                        <path d="M0 0L6 3L0 6z" fill={RENK.softmax} />
                    </marker>
                </defs>
                {parcalar}
            </svg>
            <div className={s.mimariAnahtar}>{anahtar}</div>
        </>}
    </aside>;
};
