import { genModelViewMatrices, ICamera, ICameraPos, updateCamera } from "./Camera";
import { drawAllArrows } from "./components/Arrow";
import { drawBlockLabels } from "./components/SectionLabels";
import { drawModelCard } from "./components/ModelCard";
import { IGptModelLink, IGpuGptModel, IModelShape } from "./GptModel";
import { genGptModelLayout, IBlkDef, IGptModelLayout } from "./GptModelLayout";
import { drawText, IFontAtlasData, IFontOpts, measureText } from "./render/fontRender";
import { initRender, IRenderState, IRenderView, renderModel, resetRenderBuffers } from "./render/modelRender";
import { beginQueryAndGetPrevMs, endQuery } from "./render/queryManager";
import { SavedState } from "./SavedState";
import { isNotNil } from "@/src/utils/data";
import { Vec3, Vec4 } from "@/src/utils/vector";
import { initWalkthrough, runWalkthrough } from "./walkthrough/Walkthrough";
import { IColorMix } from "./Annotations";
import { Mat4f } from "@/src/utils/matrix";
import { runMouseHitTesting } from "./Interaction";
import { RenderPhase } from "./render/sharedRender";
import { drawBlockInfo } from "./components/BlockInfo";
import { NativeFunctions } from "./NativeBindings";
import { T_GORUNUM, GERCEK, KANAL_ADIMI, OZET } from './tr/ayarlar';
import { odakUygula, tekrarNotu } from './tr/odak';
import { kameraUyarla } from './tr/kamera';
import { IWasmGptModel, stepWasmModel, syncWasmDataWithJsAndGpu } from "./GptModelWasm";
import { IMovementInfo, manageMovement } from "./components/MovementControls";
import { IBlockRender, initBlockRender } from "./render/blockRender";
import { ILayout } from "../utils/layout";
import { DimStyle } from "./walkthrough/WalkthroughTools";
import { Subscriptions } from "../utils/hooks";

export interface IProgramState {
    native: NativeFunctions | null;
    wasmGptModel: IWasmGptModel | null;
    stepModel: boolean;
    mouse: IMouseState;
    render: IRenderState;
    inWalkthrough: boolean;
    walkthrough: ReturnType<typeof initWalkthrough>;
    camera: ICamera;
    htmlSubs: Subscriptions;
    layout: IGptModelLayout;
    mainExample: IModelExample;
    examples: IModelExample[];
    currExampleId: number;
    shape: IModelShape;
    gptGpuModel: IGpuGptModel | null;
    jsGptModel: IGptModelLink | null;
    movement: IMovementInfo;
    display: IDisplayState;
    pageLayout: ILayout;
    markDirty: () => void;
}

export interface IModelExample {
    name: string;
    shape: IModelShape;
    enabled: boolean;
    layout?: IGptModelLayout;
    blockRender: IBlockRender;
    offset: Vec3;
    modelCardOffset: Vec3;
    camera?: ICameraPos;
}

export interface IMouseState {
    mousePos: Vec3;
}

export interface IDisplayState {
    tokenColors: IColorMix | null;
    tokenIdxColors: IColorMix | null;
    tokenOutputColors: IColorMix | null;
    tokenIdxModelOpacity?: number[];
    topOutputOpacity?: number;
    lines: string[];
    hoverTarget: IHoverTarget | null;
    blkIdxHover: number[] | null;
    dimHover: DimStyle | null;
}

export interface IHoverTarget {
    subCube: IBlkDef;
    mainCube: IBlkDef;
    mainIdx: Vec3;
}

export function initProgramState(canvasEl: HTMLCanvasElement, fontAtlasData: IFontAtlasData): IProgramState {

    let render = initRender(canvasEl, fontAtlasData);
    let walkthrough = initWalkthrough();

    let prevState = SavedState.state;
    let camera: ICamera = {
        angle: prevState?.camera.angle ?? new Vec3(296, 16, 13.5),
        center: prevState?.camera.center ?? new Vec3(-8.4, 0, -481.5),
        transition: {},
        modelMtx: new Mat4f(),
        viewMtx: new Mat4f(),
        lookAtMtx: new Mat4f(),
        camPos: new Vec3(),
        camPosModel: new Vec3(),
    }

    // TR: Ana model Türkçe GPT-2 küçük (ytu-ce-cosmos/turkish-gpt2); T = sahnede gösterilen en fazla token
    // TR: Özet görünümde kanallar KANAL_ADIMI'nda bir çizilir (768 → 96, baş boyutu 64 → 8); bkz. tr/ayarlar.ts
    let shape: IModelShape = {
        B: 1,
        T: T_GORUNUM,
        C: GERCEK.C / KANAL_ADIMI,
        nHeads: GERCEK.nHeads,
        A: GERCEK.A / KANAL_ADIMI,
        nBlocks: OZET ? 1 : GERCEK.nBlocks, // TR: özette tek blok + "× 12" notu (tr/odak.ts)
        vocabSize: GERCEK.V,
    };

    let gpt2ShapeSmall: IModelShape = {
        B: 1,
        T: 1024,
        C: 768,
        nHeads: 12,
        A: 768 / 12,
        nBlocks: 12,
        vocabSize: 50257,
    };

    let gpt2ShapeLarge: IModelShape = {
        B: 1,
        T: 1024,
        C: 1600,
        nHeads: 25,
        A: 1600 / 25,
        nBlocks: 48,
        vocabSize: 50257,
    };

    let gpt3Shape: IModelShape = {
        B: 1,
        T: 1024,
        C: 12288,
        nHeads: 96,
        A: 12288 / 96,
        nBlocks: 96,
        vocabSize: 50257,
    };

    function makeCamera(center: Vec3, angle: Vec3): ICameraPos {
        return { center, angle };
    }

    let delta = new Vec3(10000, 0, 0);

    return {
        native: null,
        wasmGptModel: null,
        render: render!,
        inWalkthrough: true,
        walkthrough,
        camera,
        shape: shape,
        layout: genGptModelLayout(shape),
        currExampleId: -1,
        mainExample: {
            name: 'Türkçe GPT-2',
            enabled: true,
            shape: shape,
            offset: new Vec3(),
            modelCardOffset: new Vec3(),
            blockRender: null!,
            // TR: özgün genel görünüm kamerası nano için; Türkçe GPT-2 yerleşimine taşınır
            camera: (() => { let k = kameraUyarla(genGptModelLayout(shape), new Vec3(42.771, 0.000, -569.287), new Vec3(284.959, 26.501, 12.867)); return makeCamera(k.merkez, k.aci); })(),
        },
        examples: [], // TR: yalnızca Türkçe GPT-2 (GPT-2 XL ve GPT-3 karşılaştırma modelleri kaldırıldı)
        gptGpuModel: null,
        jsGptModel: null,
        stepModel: false,
        markDirty: () => { },
        htmlSubs: new Subscriptions(),
        mouse: {
            mousePos: new Vec3(),
        },
        movement: {
            action: null,
            actionHover: null,
            target: [0, 0],
            depth: 1,
            cameraLerp: null,
         },
        display: {
            tokenColors: null,
            tokenIdxColors: null,
            tokenOutputColors: null,
            lines: [],
            hoverTarget: null,
            dimHover: null,
            blkIdxHover: null,
        },
        pageLayout: {
            height: 0,
            width: 0,
            isDesktop: true,
            isPhone: true,
        }
    };
}

export function runProgram(view: IRenderView, state: IProgramState) {
    let timer0 = performance.now();

    if (!state.render) {
        return;
    }

    resetRenderBuffers(state.render);
    state.render.sharedRender.activePhase = RenderPhase.Opaque;
    state.display.lines = [];
    state.display.hoverTarget = null;
    state.display.tokenColors = null;
    state.display.tokenIdxColors = null;

    if (state.wasmGptModel && state.jsGptModel) {
        syncWasmDataWithJsAndGpu(state.wasmGptModel, state.jsGptModel);
    }

    if (state.stepModel && state.wasmGptModel && state.jsGptModel) {
        state.stepModel = false;
        stepWasmModel(state.wasmGptModel, state.jsGptModel);
    }

    // generate the base model, incorporating the gpu-side model if available
    state.layout = genGptModelLayout(state.shape, state.jsGptModel);

    // @TODO: handle different models in the same scene.
    // Maybe need to copy a lot of different things like the entire render state per model?
    for (let example of state.examples) {
        if (example.enabled && !example.layout) {
            let layout = genGptModelLayout(example.shape, null, example.offset);
            example.layout = layout;
        }
    }

    genModelViewMatrices(state, state.layout!);

    let queryRes = beginQueryAndGetPrevMs(state.render.queryManager, 'render');
    if (isNotNil(queryRes)) {
        state.render.lastGpuMs = queryRes;
    }

    state.render.renderTiming = false; // state.pageLayout.isDesktop;

    // will modify layout; view; render a few things.
    let tabanKupSayisi = state.layout.cubes.length; // TR: anlatımın eklediği kopya bloklar bundan sonra gelir
    if (state.inWalkthrough) {
        runWalkthrough(state, view);
    }

    odakUygula(state, tabanKupSayisi); // TR: odak modu: bölüm dışı bloklar silikleşir (oklar/etiketler de)

    updateCamera(state, view);

    drawBlockInfo(state);
    // these will get modified by the walkthrough (stored where?)
    drawAllArrows(state.render, state.layout);

    // TR: Girdi/çıktı kutuları GPT-2 ölçeğinde büyüdü; model kartı onların üstünde dursun
    drawModelCard(state, state.layout, 'Türkçe GPT-2 (küçük)', new Vec3(0, -(Math.max(1, state.layout.margin / 12) - 1) * 38));
    // drawTokens(state.render, state.layout, state.display);

    for (let example of state.examples) {
        if (example.enabled && example.layout) {
            drawModelCard(state, example.layout, example.name, example.offset.add(example.modelCardOffset));
        }
    }

    // manageMovement(state, view);
    runMouseHitTesting(state);
    state.render.sharedRender.activePhase = RenderPhase.Opaque;
    drawBlockLabels(state.render, state.layout);
    tekrarNotu(state);

    let lineNo = 1;
    let tw = state.render.size.x;
    state.render.sharedRender.activePhase = RenderPhase.Overlay2D;
    for (let line of state.display.lines) {
        let opts: IFontOpts = { color: new Vec4(), size: 14 };
        let w = measureText(state.render.modelFontBuf, line, opts);
        drawText(state.render.modelFontBuf, line, tw - w - 4, lineNo * opts.size * 1.3 + 4, opts)
        lineNo++;
    }

    // render everything; i.e. here's where we actually do gl draw calls
    // up until now, we've just been putting data in cpu-side buffers
    renderModel(state);

    endQuery(state.render.queryManager, 'render');
    state.render.gl.flush();

    state.render.lastJsMs = performance.now() - timer0;
}
