import { GERCEK } from '../tr/ayarlar';
import { camScaleToScreen } from '../Camera';
import { cameraToMatrixView } from "../Camera";
import { cellPosition, IGptModelLayout } from "../GptModelLayout";
import { IProgramState } from "../Program";
import { drawText, IFontOpts, measureText, measureTextWidth, writeTextToBuffer } from "../render/fontRender";
import { addLine, addLine2 as drawLine, drawLineSegs, ILineOpts, makeLineOpts } from "../render/lineRender";
import { IRenderState } from "../render/modelRender";
import { addQuad } from "../render/triRender";
import { lerp } from "@/src/utils/math";
import { Mat4f } from "@/src/utils/matrix";
import { Dim, Vec3, Vec4 } from "@/src/utils/vector";
import { DimStyle, dimStyleColor } from "../walkthrough/WalkthroughTools";
import { lineHeight } from "./TextLayout";
import { IColorMix } from "../Annotations";
import { clamp } from "@/src/utils/data";

export function drawModelCard(state: IProgramState, layout: IGptModelLayout, title: string, offset: Vec3) {
    let { render } = state;
    let { camPos } = cameraToMatrixView(state.camera);
    let dist = camPos.dist(new Vec3(0, 0, -30)); //.add(offset));

    let scale = clamp(dist / 500.0, 1.0, 800.0);

    let pinY = -60;
    let mtx = Mat4f.fromScaleTranslation(new Vec3(scale, scale, scale), new Vec3(0, pinY, 0).add(offset))
        .mul(Mat4f.fromTranslation(new Vec3(0, -pinY, 0)));

    let thick = 1.0 / 10.0 * scale;
    let borderColor = Vec4.fromHexColor("#555599", 0.8);
    let backgroundColor = Vec4.fromHexColor("#93c5fd", 0.3);
    let titleColor = Vec4.fromHexColor("#000000", 1.0);
    let n = new Vec3(0, 0, 1);

    let lineOpts: ILineOpts = { color: borderColor, mtx, thick, n };

    let tl = new Vec3(-45, -97, 0);
    let br = new Vec3( 45, -70, 0);
    drawLineRect(render, tl, br, lineOpts);

    addQuad(render.triRender, new Vec3(tl.x, tl.y, -0.1), new Vec3(br.x, br.y, -0.1), backgroundColor, mtx);

    // let w = measureTextWidth(state.modelFontBuf, title, .0);
    let { B, C, T, A, nBlocks, nHeads, vocabSize } = layout.shape;

    let midX = (tl.x + br.x) / 2;
    let paramLeft = br.x - 50;
    let paramOff = tl.y + 2;

    let paramLineHeight = 1.3;
    let paramFontScale = 4;
    let numWidth = paramFontScale * 0.6;
    let allNums = [B, C, T, A, nBlocks, nHeads];
    let maxLen = Math.max(...allNums.map(n => n.toString().length));
    let paramHeight = 2 + paramLineHeight * paramFontScale * 3 + 1;

    let titleFontScale = 13;
    let titleW = measureTextWidth(render.modelFontBuf, title, titleFontScale);
    let titleHeight = titleFontScale * paramLineHeight;
    writeTextToBuffer(render.modelFontBuf, title, titleColor, midX - titleW / 2, tl.y + 2, titleFontScale, mtx);

    // layout.weightCount = 150000000000;

    let nParamsText = `n_params = `;
    // TR: ana modelde sahne seyreltilmiş olabilir; kart gerçek parametre sayısını yazar
    let weightCountText = numberToCommaSep(layout === state.layout ? GERCEK.parametre : layout.weightCount);

    let weightSize = 8;
    let weightTitleW = measureTextWidth(render.modelFontBuf, nParamsText, paramFontScale);
    let weightCountW = measureTextWidth(render.modelFontBuf, weightCountText, weightSize);
    // let infoText = "goal: sort 6 letters from { A, B, C } into ascending order";
    // writeTextToBuffer(render.modelFontBuf, infoText, titleColor, tl.x + 2, tl.y + paramHeight + 2, 4, mtx);

    paramOff = tl.y + titleHeight + 4;
    let weightX = midX - (weightCountW + weightTitleW) / 2;

    writeTextToBuffer(render.modelFontBuf, nParamsText, titleColor, weightX, paramOff - paramFontScale / 2, paramFontScale, mtx);
    writeTextToBuffer(render.modelFontBuf, weightCountText, titleColor, weightX + weightTitleW, paramOff - weightSize / 2, weightSize, mtx);
    // addParam("C (channels) = ", C.toString(), dimStyleColor(DimStyle.C));
    // addParam("T (time) = ", T.toString(), dimStyleColor(DimStyle.T));
    // addParam("B (batches) = ", B.toString(), dimStyleColor(DimStyle.B));
    // paramOff = tl.y + 2;
    // paramLeft += 35;
    // addParam("n_vocab = ", vocabSize.toString(), dimStyleColor(DimStyle.n_vocab));
    // addParam("n_layers = ", nBlocks.toString(), dimStyleColor(DimStyle.n_layers));
    // addParam("n_heads = ", nHeads.toString(), dimStyleColor(DimStyle.n_heads));

    // function addParam(name: string, value: string, color: Vec4 = borderColor) {
    //     let y = paramOff;
    //     let w = measureTextWidth(render.modelFontBuf, name, paramFontScale);
    //     let numW = measureTextWidth(render.modelFontBuf, value, paramFontScale);
    //     let left = paramLeft;
    //     writeTextToBuffer(render.modelFontBuf, name, color,  left - w        , y, paramFontScale, mtx);
    //     writeTextToBuffer(render.modelFontBuf, value, color, left + maxLen * numWidth - numW, y, paramFontScale, mtx);
    //     paramOff += paramFontScale * paramLineHeight;
    // }

    // addLine(render.lineRender, thick, borderColor, new Vec3(tl.x, tl.y + paramHeight), new Vec3(br.x, tl.y + paramHeight), n, mtx);

    renderOutputAtBottom(state);

    renderInputAtTop(state);
}

export function sortABCInputTokenToString(a: number) {
    return String.fromCharCode('A'.charCodeAt(0) + a); // just A, B, C supported!
}

// TR: Türkçe GPT-2 parçasını okunur yaz (baştaki boşluk "·")
function tokenMetni(layout: IGptModelLayout, id: number) {
    let tok = (layout.model as any)?.turkce?.tok;
    return tok ? tok.coz([id]).replace(/ /g, '·') : sortABCInputTokenToString(id);
}

// TR: uzun Türkçe parçalar hücreye sığsın
function sigdir(render: IRenderState, metin: string, opts: IFontOpts, genislik: number): IFontOpts {
    let w = measureText(render.modelFontBuf, metin, opts);
    return w > genislik ? { ...opts, size: opts.size * genislik / w } : opts;
}

export interface IInputBoxOpts {
    tokMixes?: IColorMix | null;
    idxMixes?: IColorMix | null;
}

export function renderInputBoxes(state: IProgramState, layout: IGptModelLayout, tl: Vec3, br: Vec3, cellW: number, fontSize: number, lineOpts: ILineOpts, opts?: IInputBoxOpts) {
    let render = state.render;
    let { T } = layout.shape;
    let inCellH = br.y - tl.y;

    let tokTextOpts: IFontOpts = { color: Vec4.fromHexColor("#000000", 1.0), mtx: lineOpts.mtx, size: fontSize };
    let idxTextOpts: IFontOpts = { color: Vec4.fromHexColor("#666666", 1.0), mtx: lineOpts.mtx, size: fontSize * 0.6 };

    let dimmedTokTextOpts: IFontOpts = { ...tokTextOpts, color: tokTextOpts.color.mul(0.3) };
    let dimmedIdxTextOpts: IFontOpts = { ...idxTextOpts, color: idxTextOpts.color.mul(0.3) };

    drawLineRect(render, tl, br, lineOpts);

    let tokens = layout.model?.inputTokens.localBuffer;

    for (let i = 0; i < T; i++) {

        if (i > 0) {
            let lineX = tl.x + i * cellW;
            drawLine(render.lineRender, new Vec3(lineX, tl.y, 0), new Vec3(lineX, br.y, 0), lineOpts);
        }

        if (fontSize > 0 && tokens && i < layout.model!.inputLen) {
            let cx = tl.x + (i + 0.5) * cellW;

            let tokOpts = { ...tokTextOpts, color: mixColorValues(opts?.tokMixes ?? null, tokTextOpts.color, i) };
            let tokIdxOpts = { ...idxTextOpts, color: mixColorValues(opts?.idxMixes ?? null, idxTextOpts.color, i) };
            let tokStr = tokenMetni(layout, tokens[i]);
            tokOpts = sigdir(render, tokStr, tokOpts, cellW * 0.92);
            tokIdxOpts = sigdir(render, tokens[i].toString(), tokIdxOpts, cellW * 0.92);
            let tokW = measureText(render.modelFontBuf, tokStr, tokOpts);
            let idxW = measureText(render.modelFontBuf, tokens[i].toString(), tokIdxOpts);
            let totalH = tokOpts.size + tokIdxOpts.size;
            let top = tl.y + (inCellH - totalH) / 2;

            drawText(render.modelFontBuf, tokStr, cx - tokW / 2, top, tokOpts);
            drawText(render.modelFontBuf, tokens[i].toString(),  cx - idxW / 2, top + tokOpts.size, tokIdxOpts);
        }

    }
}

export interface IOutputBoxOpts {
    opacity?: number;
    boldLast?: boolean;
    tokMixes?: IColorMix | null;
}

export function renderOutputBoxes(state: IProgramState, layout: IGptModelLayout, tl: Vec3, br: Vec3, cellW: number, fontSize: number, lineOpts: ILineOpts, opts?: IOutputBoxOpts) {
    let render = state.render;
    let { T, vocabSize } = layout.shape;
    let outCellH = br.y - tl.y;

    let opacity = opts?.opacity ?? 1.0;
    let boldLast = opts?.boldLast ?? true;

    lineOpts = { ...lineOpts, color: lineOpts.color.mul(opacity ?? 1.0) };
    let tokTextOpts: IFontOpts = { color: Vec4.fromHexColor("#000000", opacity), mtx: lineOpts.mtx, size: fontSize };
    let idxTextOpts: IFontOpts = { color: Vec4.fromHexColor("#666666", opacity), mtx: lineOpts.mtx, size: fontSize * 0.6 };

    let dimmedTokTextOpts: IFontOpts = { ...tokTextOpts, color: tokTextOpts.color.mul(0.3) };
    let dimmedIdxTextOpts: IFontOpts = { ...idxTextOpts, color: idxTextOpts.color.mul(0.3) };

    drawLineRect(render, tl, br, lineOpts);

    let sortedOutput = layout.model?.sortedBuf;

    for (let i = 0; i < T; i++) {
        if (i > 0) {
            let lineX = tl.x + i * cellW;
            drawLine(render.lineRender, new Vec3(lineX, tl.y, 0), new Vec3(lineX, br.y, 0), lineOpts);
        }

        if (fontSize > 0 && sortedOutput && i < layout.model!.inputLen && vocabSize > 100) {
            // TR: Büyük sözlükte olasılıklar çok küçük dilimlere bölünür ve hücre kara çizgilerle dolar.
            // Her hücrede yalnızca en olası parça ve olasılığı yazılır.
            let cx = tl.x + (i + 0.5) * cellW;
            let tokIdx = sortedOutput[(i * vocabSize) * 2 + 0];
            let tokProb = sortedOutput[(i * vocabSize) * 2 + 1];
            let dimmed = i < layout.model!.inputLen - 1 || !boldLast;
            let color = mixColorValues(opts?.tokMixes ?? null, tokTextOpts.color, i);
            if (dimmed) color = color.mul(0.35);
            let tokStr = tokenMetni(layout, tokIdx);
            let pStr = '%' + Math.round(tokProb * 100);
            let tokOpts = sigdir(render, tokStr, { ...tokTextOpts, color }, cellW * 0.92);
            let pOpts = sigdir(render, pStr, { ...idxTextOpts, color: color.mul(0.7) }, cellW * 0.92);
            let tokW = measureText(render.modelFontBuf, tokStr, tokOpts);
            let pW = measureText(render.modelFontBuf, pStr, pOpts);
            let top = tl.y + (outCellH - tokOpts.size - pOpts.size) / 2;
            drawText(render.modelFontBuf, tokStr, cx - tokW / 2, top, tokOpts);
            drawText(render.modelFontBuf, pStr, cx - pW / 2, top + tokOpts.size, pOpts);
        } else if (fontSize > 0 && sortedOutput && i < layout.model!.inputLen) {
            let usedSoFar = 0.0;
            let cx = tl.x + (i + 0.5) * cellW;

            for (let j = 0; j < Math.min(vocabSize, 12); j++) { // TR: yalnızca en olası birkaç parça (sıralı)
                let tokIdx = sortedOutput[(i * vocabSize + j) * 2 + 0];
                let tokProb = sortedOutput[(i * vocabSize + j) * 2 + 1];

                let partTop = tl.y + usedSoFar * outCellH;
                let partH = tokProb * outCellH;

                let dimmed = i < layout.model!.inputLen - 1 || !boldLast;

                let color = mixColorValues(opts?.tokMixes ?? null, tokTextOpts.color, i);
                if (dimmed) {
                    color = color.mul(0.3);
                }

                let tokStr = tokenMetni(layout, tokIdx);
                let tokOpts = sigdir(render, tokStr, { ...tokTextOpts, color }, cellW * 0.92);
                let idxOpts = sigdir(render, tokIdx.toString(), { ...idxTextOpts, color: color.mul(0.6) }, cellW * 0.92);

                let tokW = measureText(render.modelFontBuf, tokStr, tokOpts);
                let idxW = measureText(render.modelFontBuf, tokIdx.toString(), idxOpts);
                let textH = tokOpts.size + idxOpts.size;
                let top = partTop + (partH - textH) / 2;

                if (partH > textH) {
                    drawText(render.modelFontBuf, tokStr, cx - tokW / 2, top, tokOpts);
                    drawText(render.modelFontBuf, tokIdx.toString(),  cx - idxW / 2, top + tokOpts.size, idxOpts);
                }

                usedSoFar += tokProb;

                drawLine(render.lineRender, new Vec3(cx - cellW/2, partTop + partH, 0), new Vec3(cx + cellW/2, partTop + partH, 0), lineOpts);
                if (usedSoFar >= 1.0 - 1e-4) {
                    break;
                }
            }
        }
    }
}

export function mixColorValues(mixes: IColorMix | null, baseColor: Vec4, idx: number) {
    if (!mixes) {
        return baseColor;
    }
    let mix = mixes.mixes[idx] ?? 0.0;
    return Vec4.lerp(mixes.color1 ?? baseColor, mixes.color2, mix);
}

let _lineRectArr = new Float32Array(3 * 4);
export function drawLineRect(render: IRenderState, tl: Vec3, br: Vec3, opts: ILineOpts) {

    _lineRectArr[0] = tl.x;
    _lineRectArr[1] = tl.y;
    _lineRectArr[2] = 0;
    _lineRectArr[3] = br.x;
    _lineRectArr[4] = tl.y;
    _lineRectArr[5] = 0;
    _lineRectArr[6] = br.x;
    _lineRectArr[7] = br.y;
    _lineRectArr[8] = 0;
    _lineRectArr[9] = tl.x;
    _lineRectArr[10] = br.y;
    _lineRectArr[11] = 0;

    drawLineSegs(render.lineRender, _lineRectArr, makeLineOpts({ ...opts, closed: true }));
}

function numberToCommaSep(a: number) {
    let s = a.toString();
    let out = "";
    for (let i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 == 0) {
            out += ",";
        }
        out += s[i];
    }
    return out;
}

// TR: Uzaktan bakınca kutulardaki yazılar birkaç piksele iner ve kara bir leke gibi görünür; o zaman yazma.
function gorunurYazi(state: IProgramState, pt: Vec3, boy: number) {
    let px = boy / (camScaleToScreen(state, pt) / 5);
    return px < 3 ? 0 : boy;
}

function renderInputAtTop(state: IProgramState) {
    let layout = state.layout;
    let render = state.render;

    let inputTokBlk = layout.idxObj;

    let topMid = new Vec3(inputTokBlk.x + inputTokBlk.dx/2, inputTokBlk.y - layout.margin);

    // TR: Özgün kutular nano ölçeğindeydi (margin 12). GPT-2'de bloklarla orantılı olsun; Türkçe parçalar
    // ("·kitabı") harften uzun olduğundan hücreler biraz daha geniş.
    let k = Math.max(1, layout.margin / 12);
    let inCellH = 10 * k;
    let inCellW = 6 * k * (layout.shape.vocabSize > 100 ? 1.6 : 1);
    let yazi = gorunurYazi(state, topMid, 4 * k);

    let nCells = layout.shape.T;
    let tl = new Vec3(topMid.x - inCellW * nCells / 2, topMid.y - inCellH);
    let br = new Vec3(topMid.x + inCellW * nCells / 2, topMid.y);

    let outputOpacity = state.display.topOutputOpacity ?? 1.0;

    let lineOpts = makeLineOpts({ color: Vec4.fromHexColor("#000000", 0.2), mtx: new Mat4f(), thick: 1.5 * k });
    let titleTextOpts: IFontOpts = { color: Vec4.fromHexColor("#666666", 1.0), mtx: lineOpts.mtx, size: 1.9 * k };

    renderInputBoxes(state, layout, tl, br, inCellW, yazi, lineOpts, { tokMixes: state.display.tokenColors, idxMixes: state.display.tokenIdxColors });

    let inputTitle = "Girdi";
    drawText(render.modelFontBuf, inputTitle, tl.x, tl.y - lineHeight(titleTextOpts), titleTextOpts);

    {
        let outCellH = 12 * k;
        let outBr = new Vec3(br.x, tl.y - 4 * k);
        let outTl = new Vec3(tl.x, outBr.y - outCellH);
        renderOutputBoxes(state, layout, outTl, outBr, inCellW, yazi, lineOpts, { opacity: outputOpacity, boldLast: outputOpacity < 1.0, tokMixes: state.display.tokenOutputColors });

        let outputTitle = "Çıktı (sıradaki parça)";
        let outputTextOpts = { ...titleTextOpts, color: titleTextOpts.color.mul(outputOpacity) };
        drawText(render.modelFontBuf, outputTitle, outTl.x, outTl.y - lineHeight(titleTextOpts), outputTextOpts);
    }

    for (let i = 0; i < nCells; i++) {
        let mixes = state.display.tokenIdxColors;

        let lineOptsLocal = { ...lineOpts, color: mixColorValues(mixes, lineOpts.color, i) };

        let tx = tl.x + (i + 0.5) * inCellW;
        let ty = tl.y + layout.cell + inCellH;
        let bx = cellPosition(layout, inputTokBlk, Dim.X, i) + 0.5 * layout.cell;
        let by = inputTokBlk.y - 0.5 * layout.cell;

        let midY1 = lerp(by, ty, 1/6);
        let midY2 = lerp(by, ty, 3/4);

        drawLine(state.render.lineRender, new Vec3(bx, by), new Vec3(bx, midY1), lineOptsLocal);
        drawLine(state.render.lineRender, new Vec3(bx, midY1), new Vec3(tx, midY2), lineOptsLocal);
        drawLine(state.render.lineRender, new Vec3(tx, midY2), new Vec3(tx, ty), lineOptsLocal);

        let arrLen = 0.6 * k;
        let arrowLeft = new Vec3(bx - arrLen, by - arrLen);
        let arrowRight = new Vec3(bx + arrLen, by - arrLen);
        drawLine(state.render.lineRender, arrowLeft, new Vec3(bx, by), lineOptsLocal);
        drawLine(state.render.lineRender, arrowRight, new Vec3(bx, by), lineOptsLocal);
    }
}

function renderOutputAtBottom(state: IProgramState) {
    let layout = state.layout;

    let softmax = layout.logitsSoftmax;


    let topMid = new Vec3(softmax.x + softmax.dx/2, softmax.y + softmax.dy + layout.margin);

    let k = Math.max(1, layout.margin / 12); // TR: bkz. renderInputAtTop
    let outCellH = 10 * k;
    let outCellW = 6 * k * (layout.shape.vocabSize > 100 ? 1.6 : 1);
    let yazi = gorunurYazi(state, topMid, 4 * k);

    let nCells = layout.shape.T;
    let tl = new Vec3(topMid.x - outCellW * nCells / 2, topMid.y);
    let br = new Vec3(topMid.x + outCellW * nCells / 2, topMid.y + outCellH);

    let lineOpts = makeLineOpts({ color: Vec4.fromHexColor("#000000", 0.2), mtx: new Mat4f(), thick: 1.5 * k });

    renderOutputBoxes(state, layout, tl, br, outCellW, yazi, lineOpts, { boldLast: true, tokMixes: state.display.tokenOutputColors });

    for (let i = 0; i < nCells; i++) {
        let tx = cellPosition(layout, softmax, Dim.X, i) + 0.5 * layout.cell;
        let ty = softmax.y + softmax.dy + 0.5 * layout.cell;
        let bx = tl.x + (i + 0.5) * outCellW;
        let by = tl.y - layout.cell;

        let midY1 = lerp(ty, by, 1/6);
        let midY2 = lerp(ty, by, 3/4);

        drawLine(state.render.lineRender, new Vec3(tx, ty), new Vec3(tx, midY1), lineOpts);
        drawLine(state.render.lineRender, new Vec3(tx, midY1), new Vec3(bx, midY2), lineOpts);
        drawLine(state.render.lineRender, new Vec3(bx, midY2), new Vec3(bx, by), lineOpts);

        let arrLen = 0.6 * k;
        let arrowLeft = new Vec3(bx - arrLen, by - arrLen);
        let arrowRight = new Vec3(bx + arrLen, by - arrLen);
        drawLine(state.render.lineRender, arrowLeft, new Vec3(bx, by), lineOpts);
        drawLine(state.render.lineRender, arrowRight, new Vec3(bx, by), lineOpts);
    }

}
