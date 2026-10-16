'use client';

import { ensureShadersReady } from '@/src/utils/shader';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { IDataAndModel, IModelState, initModel } from './GptModel';
import s from './LayerView.module.scss';
import { IRenderState, IRenderView } from './render/modelRender';
import { fetchFontAtlasData, IFontAtlasData } from './render/fontRender';
import { Random } from '@/src/utils/random';
import { ITensorSet, TensorF32 } from '@/src/utils/tensor';
import { ProgramStateContext, WalkthroughSidebar } from './Sidebar';
import { initProgramState, IProgramState, runProgram } from './Program';
import { CanvasEventSurface } from './CanvasEventSurface';
import { Vec3 } from '@/src/utils/vector';
import { loadNativeBindings } from './NativeBindings';
import { constructModel, createGpuModelForWasm } from './GptModelWasm';
import { MovementAction } from './components/MovementControls';
import { useScreenLayout } from '@/src/utils/layout';
import { jumpPhase } from './Commentary';
import { WelcomePopup } from './WelcomePopup';
import { KeyboardManagerContext, KeyboardOrder, useGlobalKeyboard } from '@/src/utils/keyboard';
import { Resizer } from '../utils/Resizer';
import { ModelSelectorToolbar } from './components/ModelSelectorToolbar';
import { ITurkceLink, ITurkceModel, ileri, sonuclariYaz, turkceLinkOlustur, turkceModelYukle } from './tr/TurkceModel';
import { ORNEK_CUMLE } from './tr/ayarlar';
import { KameraKontrol } from './tr/KameraKontrol';
import { DurumKutusu } from './tr/DurumKutusu';
import { TurkcePanel } from './tr/TurkcePanel';

async function fetchTensorData(url: string): Promise<ITensorSet> {
    let resp = await fetch(url);
    let data = await resp.json();
    for (let k in data) {
        if (data[k].shape) {
            data[k] = TensorF32.fromJson(data[k]);
        }
    }
    return data;
}

export function LayerView() {
    let [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
    let [dataAndModel, setDataAndModel] = useState<IDataAndModel | null>(null);
    let [canvasRender, setCanvasRender] = useState<CanvasRender | null>(null);
    let [fontAtlasData, setFontAtlasData] = useState<IFontAtlasData | null>(null);
    let layout = useScreenLayout();
    let keyboardManager = useContext(KeyboardManagerContext);

    function handleCopyCamera(ev: React.MouseEvent) {
        let camera = canvasRender?.progState.camera;
        if (!camera) {
            return;
        }

        let vecToString = (vec: Vec3) => `new Vec3(${vec.x.toFixed(3)}, ${vec.y.toFixed(3)}, ${vec.z.toFixed(3)})`;

        let cameraStr = `${vecToString(camera.center)}, ${vecToString(camera.angle)}`;

        let el = document.createElement('textarea');
        el.value = cameraStr;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }

    useGlobalKeyboard(KeyboardOrder.MainPage, (ev: KeyboardEvent) => {
        if (!canvasRender?.progState) {
            return;
        }
        let key = ev.key.toLowerCase();
        let wt = canvasRender.progState.walkthrough;
        let mvmt = canvasRender.progState.movement;
        if (ev.key === ' ') {
            if (wt.time >= wt.phaseLength) {
                jumpPhase(wt, 1);
                wt.time = 0;
            } else {
                wt.running = !wt.running;
            }
            canvasRender.markDirty();
        }
        if (ev.key === 'Backspace' || ev.key === 'Delete') {
            wt.running = false;
            wt.time = 0;
            canvasRender.markDirty();
        }

        if (ev.key === 'ArrowLeft' || key === 'a') {
            mvmt.action = MovementAction.Left;
            canvasRender.markDirty();
        }
        if (ev.key === 'ArrowRight' || key === 'd') {
            mvmt.action = MovementAction.Right;
            canvasRender.markDirty();
        }
        if (ev.key === 'ArrowUp' || key === 'w') {
            mvmt.action = MovementAction.Up;
            canvasRender.markDirty();
        }
        if (ev.key === 'ArrowDown' || key === 's') {
            mvmt.action = MovementAction.Down;
            canvasRender.markDirty();
        }
        if (ev.key === 'PageUp' || key === 'q') {
            mvmt.action = MovementAction.In;
            canvasRender.markDirty();
        }
        if (ev.key === 'PageDown' || key === 'e') {
            mvmt.action = MovementAction.Out;
            canvasRender.markDirty();
        }
        if (key === 'r') {
            mvmt.action = MovementAction.Expand;
            canvasRender.markDirty();
        }
        if (key === 'f') {
            mvmt.action = MovementAction.Focus;
            canvasRender.markDirty();
        }

        if (ev.key === ' ') {
            ev.preventDefault();
        }
    });

    useEffect(() => {
        document.addEventListener('keydown', keyboardManager.handleKey);
        return () => {
            document.removeEventListener('keydown', keyboardManager.handleKey);
        };
    }, [keyboardManager]);

    // TR: Türkçe GPT-2 ağırlıkları (8 bit, ~125 MB) ve tokenizer
    let [turkce, setTurkce] = useState<ITurkceModel | null>(null);
    let [ilerleme, setIlerleme] = useState(0);
    let [yukHata, setYukHata] = useState<string | null>(null);
    // TR: telefonda 125 MB indirme + ~400 MB ekran kartı belleği; kullanıcı onaylamadan başlama
    let [indirmeIzni, setIndirmeIzni] = useState<boolean | null>(null);
    useEffect(() => { setIndirmeIzni(!/android|iphone|ipad|ipod/i.test(navigator.userAgent)); }, []);
    useEffect(() => {
        if (!indirmeIzni) return;
        let stale = false;
        turkceModelYukle(o => !stale && setIlerleme(o))
            .then(m => { if (!stale) setTurkce(m); })
            .catch(e => { console.error(e); if (!stale) setYukHata(String(e?.message ?? e)); });
        return () => { stale = true; };
    }, [indirmeIzni]);

    useEffect(() => {
        let stale = false;
        async function getData() {
            let data = await fetchFontAtlasData();
            if (stale) return;
            setFontAtlasData(data);
        }

        getData();

        return () => { stale = true; };
    }, []);

    useEffect(() => {
        if (canvasEl && fontAtlasData) {
            let canvasRenderLocal = new CanvasRender(canvasEl, null!, fontAtlasData);
            let resizeObserver = new ResizeObserver(() => {
                canvasRenderLocal.canvasSizeDirty = true;
                canvasRenderLocal.markDirty();
            });
            let handleWheel = (ev: WheelEvent) => ev.preventDefault();
            setCanvasRender(canvasRenderLocal);
            resizeObserver.observe(canvasEl);
            canvasEl.addEventListener('wheel', handleWheel, { passive: false });
            return () => {
                canvasEl!.removeEventListener('wheel', handleWheel);
                canvasRenderLocal.destroy();
                resizeObserver.disconnect();
            };
        } else {
            setCanvasRender(null);
        }
    }, [canvasEl, fontAtlasData]);

    useEffect(() => {
        canvasRender?.setData({ dataAndModel });
    }, [canvasRender, dataAndModel]);

    useEffect(() => {
        if (canvasRender && turkce) canvasRender.turkceKur(turkce);
    }, [canvasRender, turkce]);

    useLayoutEffect(() => {
        if (canvasRender) {
            canvasRender.progState.pageLayout = layout;
            canvasRender.markDirty();
        }
    }, [canvasRender, layout]);

    let sidebar = canvasRender && <div className={s.sidebar}>
        <ProgramStateContext.Provider value={canvasRender.progState}>
            <WalkthroughSidebar />
        </ProgramStateContext.Provider>
    </div>;

    let mainView = <div className={s.canvasWrap}>
        <canvas
            className={s.canvas}
            ref={setCanvasEl}
        />
        {canvasRender && !canvasRender.progState.render && <div className='absolute flex flex-col items-center w-full h-full justify-center'>
            <div className='text-2xl'>Bu sayfa WebGL2 destekleyen bir tarayıcı ister.</div>
            <div className='text-lg mt-2'>Chrome, Edge ya da Firefox'un güncel sürümünü deneyin.</div>
        </div>}
        {/* <div className={s.cursorFollow} style={{ top: pointPos.y, left: pointPos.x }} /> */}
        {canvasRender && <ProgramStateContext.Provider value={canvasRender.progState}>
            <CanvasEventSurface>
                {/* <MovementControls /> */}
            </CanvasEventSurface>
            {/* <WelcomePopup /> */}
            {/* <div className="absolute bottom-0 right-0 m-5 bg-white rounded border">
                <button className='hover:bg-blue-400' onClick={handleCopyCamera}>
                    Copy Camera
                </button>
            </div> */}
            <ModelSelectorToolbar />
            <DurumKutusu />
            <KameraKontrol />
            <TurkcePanel ilerleme={ilerleme} hata={yukHata} calistir={(m) => canvasRender?.turkceCalistir(m)} izinBekliyor={indirmeIzni === false} izinVer={() => setIndirmeIzni(true)} />
        </ProgramStateContext.Provider>}
    </div>;

    return <div className={s.view}>
        <Resizer id={"llm-sidebar"} className={"flex-1"} vertical={!layout.isDesktop} defaultAmt={0.4}>
            {layout.isDesktop && sidebar}
            {mainView}
            {!layout.isDesktop && sidebar}
        </Resizer>
    </div>;
}

interface ICanvasData {
    dataAndModel: IDataAndModel | null;
}

class CanvasRender {
    renderState: IRenderState;
    progState: IProgramState;
    modelState: IModelState | null = null;
    random: Random;
    stopped = false;
    canvasSizeDirty = true;

    constructor(canvasEl: HTMLCanvasElement, private canvasData: ICanvasData, fontAtlasData: IFontAtlasData) {
        this.progState = initProgramState(canvasEl, fontAtlasData);
        this.progState.markDirty = this.markDirty;
        this.progState.walkthrough.markDirty = this.markDirty;
        this.renderState = this.progState.render;
        this.random = new Random(4);
        // TR: Özgünde örnek modellerin (GPT-2 XL, GPT-3) gölgelendiricileri WASM/GPU model kurulurken bağlanıyordu
        // (GptModel.ts). O yol kaldırıldığı için burada bağlanmazlarsa örnek modeller hiç çizilmez.
        if (this.progState.render) ensureShadersReady(this.progState.render.ctx.shaderManager);
    }

    destroy() {
        this.stopped = true;
    }

    setData(data: ICanvasData) {
        this.canvasData = data;

        this.markDirty();
    }

    // TR: Türkçe GPT-2 dokularını kur ve örnek cümleyi çalıştır
    turkceKur(m: ITurkceModel) {
        if (!this.progState.render || this.progState.jsGptModel) return;
        let link = turkceLinkOlustur(this.renderState.gl, m, this.progState.shape.T);
        this.progState.jsGptModel = link;
        (window as any).__prog = this.progState; // test betikleri için
        this.turkceCalistir(ORNEK_CUMLE);
    }

    turkceCalistir(metin: string) {
        let link = this.progState.jsGptModel as ITurkceLink | null;
        if (!link?.turkce) return null;
        let ids = link.turkce.tok.kodla(metin).map(p => p.id).slice(0, link.shape.T);
        if (ids.length === 0) return null;
        let sure = performance.now();
        let sonuc = ileri(link.turkce, ids, link.shape.T);
        sonuclariYaz(link, sonuc);
        console.log('Türkçe GPT-2 ileri geçiş', Math.round(performance.now() - sure), 'ms,', ids.length, 'token');
        this.markDirty();
        return sonuc;
    }

    prevTime: number = performance.now();
    rafHandle: number = 0;
    isDirty = false;
    isWaitingForSync = false;

    markDirty = () => {
        if (!this.canvasData || this.stopped) {
            return;
        }

        this.isDirty = true;
        if (!this.rafHandle) {
            this.prevTime = performance.now();
            this.rafHandle = requestAnimationFrame(this.loop);
        }
    }

    loop = (time: number) => {
        if (!(this.isDirty || this.isWaitingForSync) || this.stopped) {
            this.rafHandle = 0;
            return;
        }
        let wasDirty = this.isDirty;

        this.isDirty = false;
        this.isWaitingForSync = false;

        let dt = time - this.prevTime;
        this.prevTime = time;
        if (dt < 8) dt = 16; // sometimes we get -ve dt due to perf.now() vs requestAnimationFrame() timing, so put to 16ms in that case

        // we separate waitingForSync from dirty, so we don't have to render if we're only waiting for sync
        this.checkSyncObjects();
        let prevSyncCount = this.progState.render?.syncObjects.length ?? 0;

        if (wasDirty || this.isDirty) {
            this.render(time, dt);
        }

        let newSyncCount = this.progState.render?.syncObjects.length ?? 0;
        if (newSyncCount !== prevSyncCount) {
            this.isWaitingForSync = true;
        }

        this.rafHandle = requestAnimationFrame(this.loop);
    }

    checkSyncObjects() {
        if (!this.progState.render) {
            return;
        }

        let gl = this.renderState.gl;
        let objs = this.progState.render.syncObjects;
        let anyToRemove = false;

        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            if (obj.isReady) {
                anyToRemove = true;
                continue;
            }
            let syncStatus = gl.clientWaitSync(obj.sync, 0, 0);
            if (syncStatus === gl.TIMEOUT_EXPIRED) {
                this.isWaitingForSync = true;
            } else {
                obj.isReady = true;
                obj.elapsedMs = performance.now() - obj.startTime;
                gl.deleteSync(obj.sync);
                anyToRemove = true;
            }
        }
        if (anyToRemove) {
            this.progState.render.syncObjects = objs.filter(o => !o.isReady);
            this.markDirty();
        }
    }

    render(time: number, dt: number) {
        if (!this.progState.render) {
            return;
        }

        let canvasEl = this.renderState.canvasEl;

        if (this.canvasSizeDirty) {
            let bcr = canvasEl.getBoundingClientRect();
            let scale = window.devicePixelRatio;
            canvasEl.width = bcr.width * scale;
            canvasEl.height = bcr.height * scale;
            this.progState.render.size = new Vec3(bcr.width, bcr.height);
            this.canvasSizeDirty = false;
        }

        let view: IRenderView = { time, dt, markDirty: this.markDirty };
        runProgram(view, this.progState);
        this.progState.htmlSubs.notify();
    }

}
