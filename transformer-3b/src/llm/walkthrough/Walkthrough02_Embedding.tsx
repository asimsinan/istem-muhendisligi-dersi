import { duplicateGrid, splitGrid } from "../Annotations";
import { GERCEK, KANAL_ADIMI, OZET } from "../tr/ayarlar";
import { getBlockValueAtIdx } from "../components/DataFlow";
import { IBlkDef } from "../GptModelLayout";
import { drawText, IFontOpts, measureText } from "../render/fontRender";
import { lerp } from "@/src/utils/math";
import { Mat4f } from "@/src/utils/matrix";
import { Dim, Vec3, Vec4 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { ornek, sayi } from "../tr/ornek";
import { commentary, DimStyle, IWalkthroughArgs, moveCameraTo, setInitialCamera } from "./WalkthroughTools";
import { processUpTo, startProcessBefore } from "./Walkthrough00_Intro";

export function walkthrough02_Embedding(args: IWalkthroughArgs) {
    let { walkthrough: wt, state, tools: { c_str, c_blockRef, c_dimRef, afterTime, cleanup, breakAfter }, layout } = args;
    let render = state.render;

    if (wt.phase !== Phase.Input_Detail_Embedding) {
        return;
    }

    let o = ornek(state);
    let tok = o.tokenler[o.sira] ?? '…', tokId = o.ids[o.sira] ?? 0, C = GERCEK.C; // TR: anlatımda gerçek boyut
    setInitialCamera(state, new Vec3(15.654, 0.000, -80.905), new Vec3(287.000, 14.500, 3.199));
    wt.dimHighlightBlocks = [layout.idxObj, layout.tokEmbedObj, layout.posEmbedObj, layout.residual0];

    commentary(wt)`
Önceki bölümde parçaların basit bir tabloyla sayılara çevrildiğini gördük. Bu sayılar, yani ${c_blockRef('_token numaraları_', state.layout.idxObj, DimStyle.TokenIdx)}, modelde tam sayı gördüğümüz ilk ve son yer. Bundan sonra hep ondalıklı sayılarla çalışacağız.

Şimdi ${o.sira + 1}. parçanın (${c_str(tok, DimStyle.Token)}) ${c_blockRef('_girdi gömmesi_', state.layout.residual0)} matrisinin ${o.sira + 1}. sütununu nasıl ürettiğine bakalım.`;
    breakAfter();

    let t_moveCamera = afterTime(null, 1.0);
    let t0_splitEmbedAnim = afterTime(null, 0.3);

    breakAfter();

    commentary(wt)`
Parçanın numarasını (${c_str(tok, DimStyle.Token)} = ${c_dimRef(String(tokId), DimStyle.TokenIdx)}) kullanarak soldaki ${c_blockRef('_token gömme matrisinden_', state.layout.tokEmbedObj)} ona ait sütunu seçeriz. Bu matriste sözlükteki her parça için bir sütun var: ${sayi(50257)} sütun. (Sahneye sığsın diye sütunlar ${sayi(o.vk)} parçalık gruplar hâlinde gösteriliyor; bizim sütunumuz ${sayi(Math.floor(tokId / o.vk) + 1)}. grubun içinde.)

Seçilen sütun ${c_dimRef('_C_ = ' + C, DimStyle.C)} uzunluğunda bir vektördür; buna parçanın _token gömmesi_ denir.
    `;
    breakAfter();

    let t1_fadeEmbedAnim = afterTime(null, 0.3);
    let t2_highlightTokenEmbed = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
Parçamız dizinin ${o.sira + 1}. _konumunda_ (t = ${c_dimRef(String(o.sira), DimStyle.T)}) olduğu için ${c_blockRef('_konum gömme matrisinin_', state.layout.posEmbedObj)} ${o.sira + 1}. sütununu da alırız. Bu matriste 1.024 sütun var (model en fazla 1.024 parçalık metin okuyabilir); sahnede ilk ${state.shape.T} tanesi görünüyor.

Bu da ${c_dimRef('_C_ = ' + C, DimStyle.C)} uzunluğunda bir vektör üretir: _konum gömmesi_.
    `;
    breakAfter();

    let t4_highlightPosEmbed = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
Hem token hem konum gömmeleri eğitim sırasında öğrenildi (mavi renk bunu gösterir).

Elimizdeki iki sütun vektörünü eleman eleman toplayarak yine ${c_dimRef('_C_ = ' + C, DimStyle.C)} uzunluğunda yeni bir sütun vektörü elde ederiz.
`;

    breakAfter();

    let t3_moveTokenEmbed = afterTime(null, 0.8);
    let t5_movePosEmbed = afterTime(null, 0.8);
    let t6_plusSymAnim = afterTime(null, 0.8);
    let t7_addAnim = afterTime(null, 0.8);
    let t8_placeAnim = afterTime(null, 0.8);
    let t9_cleanupInstant = afterTime(null, 0.0);
    let t10_fadeAnim = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
Aynı işlemi girdideki bütün parçalar için yaparız. Ortaya çıkan vektörler hem parçanın ne olduğunu hem de cümlenin neresinde durduğunu taşır.
`;

    breakAfter();

    let t11_fillRest = afterTime(null, 5.0);

    breakAfter();

    commentary(wt)`
${c_blockRef('_Girdi gömmesi_', state.layout.residual0)} matrisindeki hücrelerin üzerine gelerek her değerin nasıl hesaplandığını ve nereden geldiğini görebilirsiniz.

Bu işlemi bütün parçalar için çalıştırınca ${c_dimRef('_T_', DimStyle.T)} × ${c_dimRef('_C_', DimStyle.C)} boyutunda bir matris çıkar. ${c_dimRef('_T_', DimStyle.T)} _zaman_ (time) demek: dizide sonra gelen parçaları zamanda sonra gelmiş gibi düşünebilirsiniz. ${c_dimRef('_C_', DimStyle.C)} ise _kanal_ (channel) demek; "özellik", "boyut" ya da "gömme boyutu" da denir. ${c_dimRef('_C_', DimStyle.C)} modelin _hiperparametrelerinden_ biridir: tasarımcı, model boyutu ile başarı arasında bir denge kurarak seçer (Türkçe GPT-2'de ${C}).

${c_blockRef('_Girdi gömmesi_', state.layout.residual0)} dediğimiz bu matris artık modelin içine aktarılmaya hazır. Her biri ${c_dimRef('C', DimStyle.C)} uzunluğunda ${c_dimRef('T', DimStyle.T)} sütundan oluşan bu yapıyı rehber boyunca sık sık göreceğiz.
`;

    cleanup(t9_cleanupInstant, [t3_moveTokenEmbed, t5_movePosEmbed, t6_plusSymAnim, t7_addAnim, t8_placeAnim]);
    cleanup(t10_fadeAnim, [t0_splitEmbedAnim, t1_fadeEmbedAnim, t2_highlightTokenEmbed, t4_highlightPosEmbed]);

    moveCameraTo(state, t_moveCamera, new Vec3(7.6, 0, -33.1), new Vec3(290, 15.5, 0.8));

    let residCol: IBlkDef = null!;
    let exampleIdx = o.sira;
    if ((t0_splitEmbedAnim.t > 0.0 || t10_fadeAnim.t > 0.0) && t11_fillRest.t === 0) {
        splitGrid(layout, layout.idxObj, Dim.X, exampleIdx + 0.5, t0_splitEmbedAnim.t * 4.0);

        layout.residual0.access!.disable = true;
        layout.residual0.opacity = lerp(1.0, 0.1, t1_fadeEmbedAnim.t);

        residCol = splitGrid(layout, layout.residual0, Dim.X, exampleIdx + 0.5, t0_splitEmbedAnim.t * 4.0)!;
        residCol.highlight = 0.3;

        residCol.opacity = lerp(1.0, 0.0, t1_fadeEmbedAnim.t);

    }

    let tokValue = getBlockValueAtIdx(layout.idxObj, new Vec3(exampleIdx, 0, 0)) ?? 1;


    let tokColDupe: IBlkDef | null = null;
    let posColDupe: IBlkDef | null = null;

    if (t2_highlightTokenEmbed.t > 0.0) {
        // TR: sözlük ekseni o.vk'lık gruplarla çizildiği için sütun = numara / vk
        let tokEmbedCol = splitGrid(layout, layout.tokEmbedObj, Dim.X, Math.floor(tokValue / o.vk) + 0.5, t2_highlightTokenEmbed.t * 4.0)!;

        tokColDupe = duplicateGrid(layout, tokEmbedCol);
        tokColDupe.t = 'i';
        tokEmbedCol.highlight = 0.3;

        let startPos = new Vec3(tokEmbedCol.x, tokEmbedCol.y, tokEmbedCol.z);
        let targetPos = new Vec3(residCol.x, residCol.y, residCol.z).add(new Vec3(-2.0, 0, 3.0));

        let pos = startPos.lerp(targetPos, t3_moveTokenEmbed.t);

        tokColDupe.x = pos.x;
        tokColDupe.y = pos.y;
        tokColDupe.z = pos.z;
    }


    if (t4_highlightPosEmbed.t > 0.0) {
        let posEmbedCol = splitGrid(layout, layout.posEmbedObj, Dim.X, exampleIdx + 0.5, t4_highlightPosEmbed.t * 4.0)!;

        posColDupe = duplicateGrid(layout, posEmbedCol);
        posColDupe.t = 'i';
        posEmbedCol.highlight = 0.3;

        let startPos = new Vec3(posEmbedCol.x, posEmbedCol.y, posEmbedCol.z);
        let targetPos = new Vec3(residCol.x, residCol.y, residCol.z).add(new Vec3(2.0, 0, 3.0));

        let pos = startPos.lerp(targetPos, t5_movePosEmbed.t);

        posColDupe.x = pos.x;
        posColDupe.y = pos.y;
        posColDupe.z = pos.z;
    }

    if (t6_plusSymAnim.t > 0.0 && tokColDupe && posColDupe && t7_addAnim.t < 1.0) {
        let adim = Math.ceil(layout.shape.C / 48); // TR: 768 hücrede her birine "+" çizmek yerine seyrek
        for (let c = 0; c < layout.shape.C; c += adim) {
            let plusCenter = new Vec3(
                (tokColDupe.x + tokColDupe.dx + posColDupe.x) / 2,
                tokColDupe.y + layout.cell * (c + 0.5),
                tokColDupe.z + tokColDupe.dz / 2);

            let isActive = t6_plusSymAnim.t > (c + 1) / layout.shape.C;
            let opacity = lerp(0.0, 1.0, isActive ? 1 : 0);

            let fontOpts: IFontOpts = { color: new Vec4(0, 0, 0, 1).mul(opacity), size: 1.5, mtx: Mat4f.fromTranslation(plusCenter) };
            let w = measureText(render.modelFontBuf, '+', fontOpts);

            drawText(render.modelFontBuf, '+', -w/2, -fontOpts.size/2, fontOpts);
        }
    }

    let origResidPos = residCol ? new Vec3(residCol.x, residCol.y, residCol.z) : new Vec3();
    let offsetResidPos = origResidPos.add(new Vec3(0.0, 0, 3.0));

    if (t7_addAnim.t > 0.0 && tokColDupe && posColDupe) {
        let targetPos = offsetResidPos;
        let tokStartPos = new Vec3(tokColDupe.x, tokColDupe.y, tokColDupe.z);
        let posStartPos = new Vec3(posColDupe.x, posColDupe.y, posColDupe.z);

        let tokPos = tokStartPos.lerp(targetPos, t7_addAnim.t);
        let posPos = posStartPos.lerp(targetPos, t7_addAnim.t);

        tokColDupe.x = tokPos.x;
        tokColDupe.y = tokPos.y;
        tokColDupe.z = tokPos.z;
        posColDupe.x = posPos.x;
        posColDupe.y = posPos.y;
        posColDupe.z = posPos.z;

        if (t7_addAnim.t > 0.95) {
            tokColDupe.opacity = 0.0;
            posColDupe.opacity = 0.0;
            residCol.opacity = 1.0;
            residCol.highlight = 0.0;
            residCol.access!.disable = false;
            residCol.x = targetPos.x;
            residCol.y = targetPos.y;
            residCol.z = targetPos.z;
        }
    }

    if (t8_placeAnim.t > 0.0) {
        let startPos = offsetResidPos;
        let targetPos = origResidPos;
        let pos = startPos.lerp(targetPos, t8_placeAnim.t);
        residCol.x = pos.x;
        residCol.y = pos.y;
        residCol.z = pos.z;
    }

    if (t9_cleanupInstant.t > 0.0 && residCol) {
        residCol.opacity = 1.0;
        residCol.highlight = 0.0;
        residCol.access!.disable = false;
    }

    if (t11_fillRest.t > 0.0) {
        layout.residual0.access!.disable = true;

        let prevInfo = startProcessBefore(state, layout.residual0);
        processUpTo(state, t11_fillRest, layout.residual0, prevInfo);
    }
    // new Vec3(-6.9, 0, -36.5), new Vec3(281.5, 5.5, 0.8)
}
