import { Vec3 } from "@/src/utils/vector";
import { GERCEK, KANAL_ADIMI, OZET } from "../tr/ayarlar";
import { Phase } from "./Walkthrough";
import { commentary, DimStyle, IWalkthroughArgs, moveCameraTo, setInitialCamera } from "./WalkthroughTools";
import { lerp, lerpSmoothstep } from "@/src/utils/math";
import { processUpTo, startProcessBefore } from "./Walkthrough00_Intro";

export function walkthrough06_Projection(args: IWalkthroughArgs) {
    let { walkthrough: wt, state, layout, tools: { breakAfter, afterTime, c_blockRef, c_dimRef, cleanup } } = args;

    if (wt.phase !== Phase.Input_Detail_Projection) {
        return;
    }

    setInitialCamera(state, new Vec3(-73.167, 0.000, -270.725), new Vec3(293.606, 2.613, 1.366));
    let block = layout.blocks[0];
    wt.dimHighlightBlocks = [...block.heads.map(h => h.vOutBlock), block.projBias, block.projWeight, block.attnOut];

    let outBlocks = block.heads.map(h => h.vOutBlock);
    let { C, A, nHeads } = layout.shape;

    commentary(wt, null, 0)`

Öz dikkat sürecinden sonra her baştan bir çıktı elde ederiz. Bu çıktılar, Q ve K vektörlerinin yön verdiği şekilde karıştırılmış V vektörleridir.

Her başın ${c_blockRef('çıktı vektörlerini', outBlocks)} birleştirmek için onları basitçe üst üste dizeriz. Böylece her zaman adımında, ${c_dimRef('A = ' + GERCEK.A, DimStyle.A)} uzunluğundaki ${nHeads} vektörden ${c_dimRef('C = ' + GERCEK.C, DimStyle.C)} uzunluğunda tek bir vektöre geçeriz.`;

    breakAfter();

    let t_fadeOut = afterTime(null, 1.0, 0.5);
    // let t_zoomToStack = afterTime(null, 1.0);
    let t_stack = afterTime(null, 1.0);

    breakAfter();

    commentary(wt)`

GPT'de bir başın içindeki vektörlerin uzunluğunun (${c_dimRef('A = ' + GERCEK.A, DimStyle.A)}), ${c_dimRef('C', DimStyle.C)} / baş sayısı olduğuna dikkat edin (${GERCEK.C} / ${nHeads} = ${GERCEK.A}). Böylece hepsini üst üste dizdiğimizde yeniden özgün uzunluğa, ${c_dimRef('C', DimStyle.C)}'ye ulaşırız.

Buradan katmanın çıktısını elde etmek için _izdüşüm_ (projection) yaparız: her sütun için bir matris–vektör çarpımı ve eklenen bir sapma.`;

    breakAfter();

    let t_process = afterTime(null, 3.0);

    breakAfter();

    commentary(wt)`

Öz dikkat katmanının çıktısını elde ettik. Bu çıktıyı doğrudan bir sonraki adıma vermek yerine, eleman eleman girdi gömmesine ekleriz. Yeşil dikey okla gösterilen bu sürece _artık bağlantı_ (residual connection) ya da _artık yol_ (residual pathway) denir.
`;

    breakAfter();

    let t_zoomOut = afterTime(null, 1.0, 0.5);
    let t_processResid = afterTime(null, 3.0);

    cleanup(t_zoomOut, [t_fadeOut, t_stack]);

    breakAfter();

    commentary(wt)`

Katman normalizasyonu gibi artık yol da derin sinir ağlarının iyi öğrenebilmesi için önemlidir: bilgi, bloklar boyunca kaybolmadan akabilir.

Öz dikkatin sonucunu aldık; şimdi bunu Transformer bloğunun sıradaki kısmına, ileri beslemeli ağa (MLP) aktarabiliriz.
`;

    breakAfter();

    if (t_fadeOut.active) {
        for (let head of block.heads) {
            for (let blk of head.cubes) {
                if (blk !== head.vOutBlock) {
                    blk.opacity = lerpSmoothstep(1, 0, t_fadeOut.t);
                }
            }
        }
    }

    if (t_stack.active) {
        let targetZ = block.attnOut.z;
        for (let headIdx = 0; headIdx < block.heads.length; headIdx++) {
            let head = block.heads[headIdx];
            let targetY = head.vOutBlock.y + head.vOutBlock.dy * (headIdx - block.heads.length + 1);
            head.vOutBlock.y = lerp(head.vOutBlock.y, targetY, t_stack.t);
            head.vOutBlock.z = lerp(head.vOutBlock.z, targetZ, t_stack.t);
        }
    }

    let processInfo = startProcessBefore(state, block.attnOut);

    if (t_process.active) {
        processUpTo(state, t_process, block.attnOut, processInfo);
    }

    moveCameraTo(state, t_zoomOut, new Vec3(-8.304, 0.000, -175.482), new Vec3(293.606, 2.623, 2.618));

    if (t_processResid.active) {
        processUpTo(state, t_processResid, block.attnResidual, processInfo);
    }
}
