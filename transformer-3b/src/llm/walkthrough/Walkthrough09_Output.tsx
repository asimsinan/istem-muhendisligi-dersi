import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, DimStyle, IWalkthroughArgs, setInitialCamera, setInitialCameraBlk } from "./WalkthroughTools";
import { ornek, sayi, yuzde } from "../tr/ornek";

export function walkthrough09_Output(args: IWalkthroughArgs) {
    let { walkthrough: wt, state, tools: { c_str, c_dimRef } } = args;
    let o = ornek(state);

    if (wt.phase !== Phase.Input_Detail_Output) {
        return;
    }

    setInitialCameraBlk(state, state.layout.lmHeadWeight, new Vec3(281.600, 8.000, 30)); // TR: çıktı bölgesine doğrudan bak

    let c0 = commentary(wt, null, 0)`

Sonunda modelin sonuna geldik. Son Transformer bloğunun çıktısı bir katman normalizasyonundan geçer; ardından bir doğrusal dönüşüm (matris çarpımı) uygularız, bu kez sapmasız.

Bu son dönüşüm her sütun vektörünü ${c_dimRef('C', DimStyle.C)} uzunluğundan sözlük boyutuna (${sayi(50257)}) çıkarır. Yani her sütun için sözlükteki her parçaya bir puan üretir. Bu puanların özel bir adı var: _logit_. (Türkçe GPT-2'de bu matris, en baştaki token gömme matrisinin ta kendisidir; iki uç aynı ağırlıkları paylaşır.)

"Logit" adı "log-odds", yani her parçanın olasılık oranının logaritması anlamından gelir. "Log" denmesinin nedeni, sonra uygulayacağımız softmax'ın üstel alarak bu puanları olasılığa çevirmesidir.

Puanları düzgün olasılıklara çevirmek için softmax'tan geçiririz. Artık her sütun için, modelin sözlükteki her parçaya verdiği bir olasılık vardır.

Model metni adım adım üretirken yalnızca son sütunun olasılıklarını kullanır: ${o.n} parça verdiysek ${o.n}. sütunun çıktısına bakarız. Bu cümlede en olası devam ${c_str(o.tahmin[0]?.metin ?? '…', DimStyle.Token)} (${yuzde(o.tahmin[0]?.p ?? 0)}), ardından ${c_str(o.tahmin[1]?.metin ?? '…', DimStyle.Token)} (${yuzde(o.tahmin[1]?.p ?? 0)}) ve ${c_str(o.tahmin[2]?.metin ?? '…', DimStyle.Token)} (${yuzde(o.tahmin[2]?.p ?? 0)}).

Bu sütunun çıktısı bir dizi olasılıktır; dizinin sonuna eklemek için bunlardan birini seçmemiz gerekir. Bunu genellikle "dağılımdan örnekleyerek" yaparız: olasılığına göre ağırlıklandırılmış rastgele bir seçim. Örneğin olasılığı 0,9 olan bir parça zamanın %90'ında seçilir.

Başka seçenekler de var; örneğin her zaman en olası parçayı seçmek (açgözlü seçim) ya da yalnızca en olası k parça (top-k) veya toplam olasılığı p'ye ulaşan en küçük küme (top-p) arasından seçmek.

Dağılımın ne kadar "sivri" olacağını sıcaklık (temperature) ile de ayarlayabiliriz. Yüksek sıcaklık dağılımı düzleştirir; düşük sıcaklık olasılığı en yüksek parçalara yığar.

Bunu, softmax'tan önce logit'leri sıcaklığa bölerek yaparız. Softmax'taki üstel alma büyük sayıları çok büyüttüğü için, sayıları birbirine yaklaştırmak bu etkiyi azaltır. Bu ayarları 2B sayfada canlı olarak deneyebilirsiniz.
`;

}
