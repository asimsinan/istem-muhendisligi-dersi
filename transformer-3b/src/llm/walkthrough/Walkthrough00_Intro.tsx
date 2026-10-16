import { IWalkthrough, Phase } from "./Walkthrough";
import { GERCEK, KANAL_ADIMI, OZET } from "../tr/ayarlar";
import { Colors, commentary, DimStyle, dimStyleColor, embed, ITimeInfo, IWalkthroughArgs, moveCameraTo, phaseTools, setInitialCamera } from "./WalkthroughTools";
import s from './Walkthrough.module.scss';
import { Dim, Vec3, Vec4 } from "@/src/utils/vector";
import { clamp, makeArray } from "@/src/utils/data";
import React, { useState } from "react";
import { useProgramState } from "../Sidebar";
import { dimProps, findSubBlocks, splitGrid } from "../Annotations";
import { useGlobalDrag } from "@/src/utils/pointer";
import { BlkSpecial, IBlkDef } from "../GptModelLayout";
import { IProgramState } from "../Program";
import { lerp } from "@/src/utils/math";
import { drawDependences } from "../Interaction";
import { drawDataFlow } from "../components/DataFlow";
import { ornek, sayi, yuzde } from "../tr/ornek";

/*
We're mostly on the right track here I think.

Main things that could do with improvement:

 - Make the camera movement more robust. It should basically be on rails when moving the slider.
 - We store the camera pos at the start of a given movement, and use that as a lerp, and also
   have a default so we can do a reversal

 - Have a highlight-region animation in both the text and the model, to bring attention to a specific
   point. Probably a rectangle with a rotating border. Could also include a shaded background on the text

 - Scroll the text to the next region to read

 - Have more pronounced (& consistent) delays between: camera movement/scroll -> higlight -> action
   - Can probably combine the camera movement and the highlight into a single action, but still have
     a delay between the highlight and the action

 - Generally lean on the new display features more. Might need to add a few more (e.g. animate the dot product)
 - Also probably need to do TeX style layout for maths in the html view :( Could probably reuse the code from the
   3d layout? Just need to get the glyphs in via css/ttf, and then maybe use canvas for positioning? Hmm should
   be able to use divs with abs positioning.

 - For stopping/starting, use t + dt to figure out when it was crossed, rather than storing the lastPauseTime etc

*/

interface IIntroState {

}

function getIntroState(walkthrough: IWalkthrough): IIntroState {
    return walkthrough.phaseData.get(Phase.Intro_Intro) as IIntroState;
}

export function walkthroughIntro(args: IWalkthroughArgs) {
    let { breakAfter, afterTime, c_str } = phaseTools(args.state);
    let { state, layout, walkthrough: wt } = args;

    if (wt.phase !== Phase.Intro_Intro) {
        return;
    }

    setInitialCamera(state, new Vec3(184.744, 0.000, -636.820), new Vec3(296.000, 16.000, 13.500));

    let o = ornek(state);
    let n = o.n;

    let c0 = commentary(wt, null, 0)`Bir dil modelinin içine adım adım gireceğiz. İnceleyeceğimiz model _Türkçe GPT-2_: Yıldız Teknik Üniversitesi Cosmos ekibinin Türkçe metinle eğittiği, ${sayi(GERCEK.parametre)} parametreli bir model. 2B sayfada çalışan küçük modelin ta kendisi; şimdi tarayıcınızda, bu kez her sayının nereden geldiğini görerek çalışıyor.

Görevi tek cümleyle anlatılabilir: bir metnin devamını tahmin etmek. Örneğimiz şu cümle: ${embed(ExampleInputOutput)}
Model bu cümleden sonra hangi parçanın geleceğini tahmin edecek. (Cümleyi sağ üstteki panelden değiştirebilirsiniz; anlatım yeni cümleyle devam eder.)`;

    if (c0.t > 0) {
        for (let cube of layout.cubes) {
            if (cube.t === 'i' && cube.access) {
                cube.access.disable = true;
            }
        }
        state.display.tokenIdxModelOpacity = makeArray(n, 0);
    }

    let t4 = afterTime(null, 1.5, 0.4);

    moveCameraTo(args.state, t4, new Vec3(5.450, 0.000, 7.913), new Vec3(281.500, 12.500, 0.519));
    let t6 = afterTime(null, 1.0, 0.2);

    if (t4.active) {
        state.display.topOutputOpacity = 0.2;
    }

    if (t6.active && t6.t < 1.0) {
        let mixes = makeArray(n, 0);
        for (let i = 0; i < n; i++) {
            // want to smoothly flash each token in turn (t6.t goes from 0-1, and each token should flash at 0.2, 0.4, 0.6, 0.8, 1.0 etc)
            let highT = (i + 1.5) / (n + 2);
            mixes[i] = 1.0 - clamp(Math.abs(t6.t - highT) * 4, 0, 1);
        }
        state.display.tokenColors = { mixes, color2: dimStyleColor(DimStyle.Token) }; //  new Vec4(0.8, 0.2, 0.8) };
    }

    breakAfter();

    let tokenStr = c_str('_token_', 0, DimStyle.Token);
    let tokenIdxStr = c_str('_token numarası_', 0, DimStyle.TokenIdx);

    commentary(wt, t6)`Model metni harf harf ya da kelime kelime değil, ${tokenStr} denen parçalar hâlinde okur. Bir parça bütün bir kelime, bir kelimenin bir kısmı ya da bir noktalama işareti olabilir (baştaki "·" bir boşluğu gösterir). Modelin tanıdığı bütün parçalar onun _sözlüğünü_ oluşturur; Türkçe GPT-2'nin sözlüğünde ${sayi(50257)} parça var:${embed(TokenVocab)}

    Sözlükteki her parçanın bir sırası, yani bir ${tokenIdxStr} vardır. Modele aslında bu sayı dizisini veririz:${embed(ExampleTokenValues)}\n`;
    breakAfter();

    let t7 = afterTime(null, 1.5, 0.5);

    if (t7.active) {
        let opacity = makeArray(n, 0);
        for (let i = 0; i < n; i++) {
            let highT = (i + 1.5) / (n + 2);
            opacity[i] = clamp((t7.t - highT) * 4, 0, 1);
        }
        state.display.tokenIdxColors = { mixes: opacity, color2: dimStyleColor(DimStyle.TokenIdx) };

        let idxPos = t7.t * n;

        if (t7.t < 1.0) {
            splitGrid(layout, layout.idxObj, Dim.X, idxPos, clamp(n - idxPos, 0, 1));
            for (let blk of findSubBlocks(layout.idxObj, Dim.X, null, Math.min(n - 1, Math.floor(idxPos)))) {
                if (blk.access) {
                    blk.access.disable = false;
                }
            }
        } else {
            if (layout.idxObj.access) {
                layout.idxObj.access.disable = false;
            }
        }
    }

    breakAfter();

    let c5 = commentary(wt)`3B görünümde her yeşil hücre işlenmekte olan bir sayıyı, her mavi hücre ise bir ağırlığı (eğitimde öğrenilmiş, artık sabit bir sayıyı) gösterir. ${embed(GreenBlueCells)}
    Dizideki her sayı önce ${sayi(GERCEK.C)} elemanlı bir vektöre çevrilir (bu uzunluk bu modele özgüdür). Bu vektöre _gömme_ (embedding) denir.

    ${OZET ? `Sahnenin boyutlarına dikkat: modeldeki her vektör ${sayi(GERCEK.C)} sayı uzunluğunda. Sahnede bunların her ${KANAL_ADIMI}'incisi, yani ${sayi(GERCEK.C / KANAL_ADIMI)} hücre çiziliyor (_özet görünüm_); hücreleri yakınlaşmadan görebilesiniz diye. Hesap yine ${sayi(GERCEK.C)} sayının tamamıyla yapılır ve sahnedeki her hücre modeldeki gerçek bir sayıdır. Bütün hücreleri görmek için sağ alttaki panelden _Gerçek boyut_'a geçebilirsiniz.` : `Sahnenin boyutlarına dikkat: ${sayi(GERCEK.C)} sayılık bir vektör, burada ${sayi(GERCEK.C)} hücrelik bir sütun (_gerçek boyut_). Model o kadar büyük ki bazı adımlarda hücreleri tek tek görmek için yakınlaşmanız gerekecek (fare tekerleği ya da iki parmakla). Sağ alttaki panelden _Özet görünüm_'e dönebilirsiniz.`}`;
    breakAfter(c5);

    {
        let t_camMove = afterTime(null, 1.0, 0.5);
        let t_makeVecs = afterTime(null, 2.0, 0.5);

        moveCameraTo(state, t_camMove, new Vec3(14.1, 0, -30.4), new Vec3(286, 14.5, 0.8));

        if (t_makeVecs.active) {
            let idxPos = t_makeVecs.t * n;
            let splitWidth = clamp(n - idxPos, 0, 2);
            let splitIdx = Math.min(n - 1, Math.floor(idxPos));
            if (t_makeVecs.t < 1.0) {
                splitGrid(layout, layout.idxObj, Dim.X, idxPos, splitWidth);
                for (let blk of findSubBlocks(layout.idxObj, Dim.X, null, splitIdx)) {
                    if (blk.access) {
                        blk.access.disable = false;
                    }
                }

                splitGrid(layout, layout.residual0, Dim.X, idxPos, splitWidth);
                for (let blk of findSubBlocks(layout.residual0, Dim.X, null, splitIdx)) {
                    if (blk.access) {
                        blk.access.disable = false;
                    }
                }
            } else {
                if (layout.residual0.access) {
                    layout.residual0.access.disable = false;
                }
            }
        }
    }

    breakAfter();
    commentary(wt)`Gömme vektörleri ardından modelin içinden aşağı doğru akar: _Transformer bloğu_ denen ${GERCEK.nBlocks} katmandan art arda geçip en alta ulaşır.${OZET ? ` (Sahnede yer kazanmak için yalnızca 1. blok çiziliyor; yanındaki "× ${GERCEK.nBlocks}" notu tekrarı gösterir.)` : ''}`;
    breakAfter();

    {

        let t_firstResid = afterTime(null, 1.0, 0.5);
        moveCameraTo(state, t_firstResid, new Vec3(-23.160, 0.000, -128.380), new Vec3(292.300, 26.800, 2.400));
        let t_firstResidWalk = afterTime(null, 5.0, 0.5);

        let processState = processUpTo(state, t_firstResidWalk, layout.blocks[0].attnResidual);

        let t_firstTransformer = afterTime(null, 1.0, 0.5);
        moveCameraTo(state, t_firstTransformer, new Vec3(-78.7, 0, -274.2), new Vec3(299.4, 14.7, 4.3));
        let t_firstTransformerWalk = afterTime(null, 3.5, 0.5);
        processUpTo(state, t_firstTransformerWalk, layout.blocks[0].mlpResidual, processState);

        if (t_firstTransformer.active) {
            layout.blocks[0].transformerLabel.visible = t_firstTransformer.t;
        }

        let t_fullFrame = afterTime(null, 1.0, 0.5);
        moveCameraTo(state, t_fullFrame, new Vec3(-147, 0, -744.1), new Vec3(298.5, 23.4, 12.2));
        let t_fullFrameWalk = afterTime(null, 5.0, 0.5);
        processUpTo(state, t_fullFrameWalk, layout.ln_f.lnResid, processState);


        // let t_endFrame = afterTime(null, 1.0, 0.5);
        // moveCameraTo(state, t_endFrame, new Vec3(-18.3, 0, -1576), new Vec3(280.6, 9.7, 1.9));
        // let t_endFrameWalk = afterTime(null, 2.0, 0.5);
        // processUpTo(state, t_endFrameWalk, layout.ln_f.lnResid, processState);

        let t_output = afterTime(null, 1.0, 0.5);
        moveCameraTo(state, t_output, new Vec3(-58.4, 0, -1654.9), new Vec3(271.3, 6.4, 1.1));
        // moveCameraTo(state, t_output, new Vec3(-53.9, 0, -1654.1), new Vec3(270.9, 6.2, 1.1));
        let t_outputWalk = afterTime(null, 2.0, 0.5);
        processUpTo(state, t_outputWalk, layout.logitsSoftmax, processState);

        let t_outputToks = afterTime(null, 1.0, 0.5);

        if (t_firstResid.active) {
            let arr = makeArray(n, 0);

            if (t_outputToks.active) {
                for (let i = 0; i < n; i++) {
                    let highT = (i + 1.5) / (n + 2);
                    arr[i] = clamp((t_outputToks.t - highT) * 4, 0, 1);
                }
            }

            // state.display.lines.push(arr.map(a => a.toFixed(2).padStart(4)).join(', '));
            state.display.tokenOutputColors = { color1: new Vec4(0,0,0,0), color2: Vec4.fromHexColor('#000', 1), mixes: arr };
        }
    }

    commentary(wt)`Peki en altta ne çıkıyor? Sıradaki parçanın tahmini. ${n}. (son) konumda, sözlükteki ${sayi(50257)} parçanın her biri için "sıradaki parça bu olabilir" olasılığını elde ederiz.`

    commentary(wt)`Bu cümlede en olası devam ${c_str(o.tahmin[0]?.metin ?? '…', 0, DimStyle.Token)} (${yuzde(o.tahmin[0]?.p ?? 0)}); ardından ${c_str(o.tahmin[1]?.metin ?? '…', 0, DimStyle.Token)} ve ${c_str(o.tahmin[2]?.metin ?? '…', 0, DimStyle.Token)} geliyor. Seçilen parçayı cümlenin sonuna ekleyip bütün süreci yeniden çalıştırırız; metin böyle, parça parça üretilir. Sağ üstteki panelde bir tahmine tıklayınca olan tam olarak budur.`;

    breakAfter();
}

interface IProcessInfo {
    lastBlockIdx: number;
}

export function startProcessBefore(state: IProgramState, block: IBlkDef): IProcessInfo {
    let activeBlocks = state.layout.cubes.filter(a => a.t !== 'w');

    return {
        lastBlockIdx: activeBlocks.indexOf(block) - 1,
    };
}

export function processUpTo(state: IProgramState, timer: ITimeInfo, block: IBlkDef, prevInfo?: IProcessInfo): IProcessInfo {

    let activeBlocks = state.layout.cubes.filter(a => a.t !== 'w');

    let firstIdx = prevInfo ? prevInfo.lastBlockIdx + 1 : 0;
    let lastIdx = activeBlocks.indexOf(block);

    // we weight the time on each block by the number of cells in the block, times by how many dependent cells it has
    // although to make this less extreme, we take a fractional power of this
    let cellCounts = activeBlocks
        .filter((_, i) => i >= firstIdx && i <= lastIdx)
        .map(a => (a.cx * a.cy) * Math.pow(a.deps?.dotLen ?? 1, 0.25));
    let totalCells = cellCounts.reduce((a, b) => a + b, 0);

    let accCell = 0;
    let currIdx = firstIdx;
    let subPos = 0; // 0 -> 1
    for (let i = firstIdx; i <= lastIdx; i++) {
        let blockFract = cellCounts[i - firstIdx] / totalCells;
        accCell += blockFract;
        if (timer.t < accCell) {
            currIdx = i;
            subPos = (timer.t - (accCell - blockFract)) / blockFract;
            break;
        }
    }

    let blk = activeBlocks[currIdx];

    // default, but switched for attention matrix
    let dim0 = Dim.X;
    let dim1 = Dim.Y;
    if (blk.transpose) {
        dim0 = Dim.Y;
        dim1 = Dim.X;
    }

    let { cx } = dimProps(blk, dim0);
    let { cx: cy } = dimProps(blk, dim1);

    let horizPos = lerp(0, cx, subPos);
    let horizIdx = Math.floor(horizPos);

    let vertPos = lerp(0, cy, horizPos - horizIdx);
    let vertIdx = Math.floor(vertPos);

    let blockPos = new Vec3().withSetAt(dim0, horizIdx).withSetAt(dim1, vertIdx); // new Vec3(horizIdx, vertIdx, 0);
    let pinPos = new Vec3(Math.floor(cx / 2), 0, 0);

    if (blk === state.layout.residual0) {
        pinPos = new Vec3(cx * 2, -2, 0);
    }

    if (timer.t >= 1.0) {
        currIdx = lastIdx;
    }

    for (let i = firstIdx; i < currIdx; i++) {
        let blk = activeBlocks[i];
        if (blk.access) {
            blk.access.disable = false;
        }
    }

    if (timer.active && timer.t < 1.0) {
        drawDependences(state, blk, blockPos);
        drawDataFlow(state, blk, blockPos, pinPos);

        for (let label of state.layout.labels) {
            for (let c of label.cubes) {
                if (c === blk) {
                    label.visible = 1.0;
                }
            }
        }

        blk.highlight = 0.3;

        let column = splitGrid(state.layout, blk, dim0, horizPos, 0);
        if (column) {
            for (let col of findSubBlocks(blk, dim0, null, horizIdx)) {
                if (col.access) {
                    col.access.disable = false;
                    col.highlight = 0.1;
                }
            }
            column.highlight = 0.4;

            let curr = splitGrid(state.layout, column, dim1, vertPos, 0);
            for (let blk of findSubBlocks(column, dim1, null, vertIdx)) {
                if (blk.access) {
                    blk.access.disable = false;
                }
            }
            if (curr) {
                curr.highlight = 0.7;
            }
        }


    } else if (timer.active) {
        let blk = activeBlocks[lastIdx];
        if (blk.access) {
            blk.access.disable = false;
        }
    }

    let info = prevInfo ?? { lastBlockIdx: currIdx };
    info.lastBlockIdx = lastIdx;
    return info;
}

const ExampleInputOutput: React.FC = () => {
    let state = useProgramState();
    let cols = state.display.tokenColors;
    let { tokenler } = ornek(state);

    return <div className={s.tableWrap}>
        <div>{tokenler.map((c, i) => {
            let baseColor = dimStyleColor(DimStyle.Token);
            if (cols) {
                baseColor = Vec4.lerp(baseColor, cols.color2, cols.mixes[i] ?? 0);
            }
            return <span key={i} style={{ color: baseColor.toHexColor(), whiteSpace: 'pre' }}>{c}{' '}</span>;
        })}</div>
    </div>;
};

const ExampleTokenValues: React.FC = () => {
    let state = useProgramState();
    let cols = state.display.tokenIdxColors;
    let { ids } = ornek(state);

     return <div className={s.tableWrap}>
        <div>{ids.map((id, i) => {
            let baseColor = dimStyleColor(DimStyle.TokenIdx);
            if (cols) {
                baseColor = Vec4.lerp(baseColor, cols.color2, cols.mixes[i] ?? 0);
            }
            return <span key={i} style={{ color: baseColor.toHexColor() }}>{id} </span>;
        })}</div>
    </div>;
};

const TokenVocab: React.FC = () => {
    let state = useProgramState();
    let { tokenler, ids } = ornek(state);
    let goruldu = new Set<number>();
    let satirlar = ids.map((id, i) => ({ id, t: tokenler[i] })).filter(x => !goruldu.has(x.id) && goruldu.add(x.id)).sort((a, b) => a.id - b.id);

    return <div className={s.tableWrap}>
        <table className={s.table}>
            <tbody>
                <tr className={s.tokString} style={{ color: dimStyleColor(DimStyle.Token).toHexColor() }}>
                    <th>parça</th>{satirlar.map(x => <td key={x.id} style={{ whiteSpace: 'pre' }}>{x.t}</td>)}<td>…</td>
                </tr>
                <tr className={s.tokIndex} style={{ color: dimStyleColor(DimStyle.TokenIdx).toHexColor() }}>
                    <th>numara</th>{satirlar.map(x => <td key={x.id}>{x.id}</td>)}<td>…</td>
                </tr>
            </tbody>
        </table>
    </div>
};

const GreenBlueCells: React.FC = () => {

    let [blueNums, setBlueNums] = useState([-0.7, 0.7, -0.1]);
    let [greenNums, setGreenNums] = useState([-0.7, 0.4, 0.8]);

    let blueColor = new Vec4(0.3, 0.3, 1.0);
    let greenColor = new Vec4(0.3, 0.9, 0.3);

    return <div className={s.tableWrap}>
        <div className={s.cellInfoCols}>
            <div className={s.cellInfoCol}>
                <Cell nums={greenNums} color={greenColor} mul={0.5} />
                <Graph nums={greenNums} color={greenColor} setNums={setGreenNums} />
                <div className={s.cellInfoText}>işlenen sayılar</div>
            </div>
            <div className={s.cellInfoCol}>
                <Cell nums={blueNums} color={blueColor} mul={1} />
                <Graph nums={blueNums} color={blueColor} setNums={setBlueNums} />
                <div className={s.cellInfoText}>ağırlıklar</div>
            </div>
        </div>
    </div>
};

const Cell: React.FC<{ nums: number[], color: Vec4, mul?: number }> = ({ color, nums, mul }) => {

    let grey = new Vec4(0.5, 0.5, 0.5, 1.0);
    let cellLight = Vec4.lerp(color, grey, 0.9);
    let cellDark = cellLight.mul(0.98);
    cellDark.w = 1.0;

    let cellColor = (n: number) => {
        let weight = clamp(Math.abs(n), 0.0, 1.0);

        let negColor = new Vec4(0.0, 0.0, 0.0);
        let posColor = color;
        let zeroColor = new Vec4(0.5, 0.5, 0.5);
        if (n < 0.0) {
            return Vec4.lerp(zeroColor, negColor, weight).toHexColor();
        } else {
            return Vec4.lerp(zeroColor, posColor, weight).toHexColor();
        }
    };

    return <div className={s.cellArrayHoriz}>
        {nums.map((n, i) => {
            return <div className={s.cellRect} key={i} style={{ backgroundColor: (i % 2 === 0 ? cellLight : cellDark).toHexColor() }}>
                <div className={s.cellCircle} style={{ backgroundColor: cellColor(n * (mul ?? 1.0)) }} />
            </div>;
        })}
    </div>
};

const Graph: React.FC<{
    nums: number[],
    color: Vec4,
    max?: number,
    setNums?: (nums: number[]) => void,
}> = ({ color, nums, max, setNums }) => {
    let [graphEl, setGraphEl] = useState<HTMLDivElement | null>(null);

    let ticks = [-1, 0, 1];
    let cellW = 30;
    let dispColor = color.mul(1.0);
    dispColor.w = 0.5;

    interface IDragInitial {
        index: number;
        nums: number[];
    }

    let [, setDragStart] = useGlobalDrag<IDragInitial>(function handleMove(ev, ds) {
        let dy = ev.clientY - ds.clientY;
        let h = graphEl!.clientHeight * 0.5;
        let nums = [...ds.data.nums];
        nums[ds.data.index] = clamp(nums[ds.data.index] - dy / h, -1.0, 1.0);
        setNums?.(nums);
        ev.preventDefault();
        ev.stopImmediatePropagation();
    })

    return <div className={s.graph} style={{ width: cellW * nums.length }} ref={setGraphEl}>

        <div className={s.axisLeft} />

        <div className={s.axisZero} />

        {nums.map((n, i) => {
            let nScaled = n / (max ?? 1.0);

            return <div className={s.graphCol} key={i}>
                <div className={s.graphBar} style={{
                    backgroundColor: dispColor.toHexColor(),
                    top: nScaled < 0 ? '50%' : `${(0.5 - nScaled/2) * 100}%`,
                    height: `${(Math.abs(nScaled)/2) * 100}%`,
                }} />
                <div
                    className={s.graphBarHit}
                    onMouseDown={ev => {
                        setDragStart(ev, { index: i, nums });
                        ev.stopPropagation();
                        ev.preventDefault();
                    }}
                    style={{
                        top: `${(0.5 - nScaled/2) * 100}%`
                    }} />
                <div className={s.graphBarLabel} style={{
                     bottom: nScaled < 0 ? '50%' : undefined,
                        top: nScaled > 0 ? '50%' : undefined,
                }}>
                    {n.toFixed(1)}
                </div>
            </div>;
        })}

    </div>;

};
