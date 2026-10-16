import { camScaleToScreen } from "../Camera";
import { IProgramState } from "../Program";
import { drawText, IFontOpts, measureText } from "../render/fontRender";
import { RenderPhase } from "../render/sharedRender";
import { Mat4f } from "@/src/utils/matrix";
import { Vec3, Vec4 } from "@/src/utils/vector";
import { drawRoundedRect } from "./DataFlow";

export function drawBlockInfo(state: IProgramState) {

    for (let blk of state.layout.cubes) {

        let blkTopMid = new Vec3(blk.x + blk.dx / 2, blk.y, blk.z + blk.dz / 2);

        let scale = camScaleToScreen(state, blkTopMid);

        // TR: üst sınır nano ölçeğindeydi; GPT-2'de etiketler bloklara göre çok küçük kalıyordu
        scale = Math.min(scale, 1.45 * Math.max(1, state.layout.margin / 12));
        // have a max scale

        let textColor = new Vec4(1, 1, 1, 1).mul(blk.opacity);
        let bgColor = new Vec4(0, 0, 0, 1).mul(blk.opacity);

        if (blk.opacity === 0 || !blk.name) {
            continue;
        }

        // draw text, centered on top of the block
        let text = blk.name;
        let mtx = Mat4f.fromTranslation(blkTopMid);
        let textOpts: IFontOpts = { color: textColor, size: scale * 2.5, mtx };
        let textW = measureText(state.render.modelFontBuf, text, textOpts);
        // TR: yan yana duran dar blokların (artık yol, katman normu…) Türkçe adları uzaktan birbirinin üstüne biniyordu:
        // etiket, bloğun genişliği + aradaki boşluktan geniş olamaz
        let enGenis = blk.dx + state.layout.margin * 0.9;
        if (textW > enGenis && blk.dx > state.layout.cell * 2) {
            let k = enGenis / textW;
            textOpts = { ...textOpts, size: textOpts.size * k };
            textW *= k;
        }

        let pad = 0.4;
        state.render.sharedRender.activePhase = RenderPhase.Opaque;
        drawRoundedRect(state.render, new Vec3(-textW / 2 - pad, -textOpts.size - pad * 2, 0), new Vec3(textW / 2 + pad, 0, 0), bgColor, mtx, scale * 0.4);

        state.render.sharedRender.activePhase = RenderPhase.Overlay;
        drawText(state.render.modelFontBuf, text, -textW / 2, -textOpts.size - pad, textOpts);
    }
}
