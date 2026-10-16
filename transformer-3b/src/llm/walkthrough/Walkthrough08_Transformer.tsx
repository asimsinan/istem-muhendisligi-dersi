import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";

export function walkthrough08_Transformer(args: IWalkthroughArgs) {
    let { walkthrough: wt, state } = args;

    if (wt.phase !== Phase.Input_Detail_Transformer) {
        return;
    }

    setInitialCamera(state, new Vec3(-135.531, 0.000, -353.905), new Vec3(291.100, 13.600, 5.706));

    let c0 = commentary(wt, null, 0)`

İşte tam bir Transformer bloğu!

Her GPT modelinin büyük kısmı bu bloklardan oluşur. Bloklar art arda dizilir; birinin çıktısı bir sonrakinin girdisi olur ve artık yol hepsinin içinden akmaya devam eder. Türkçe GPT-2'de 12 blok var; GPT-2'nin en büyük sürümünde 48, GPT-3'te 96.

Derin öğrenmede çoğu zaman olduğu gibi, her katmanın tam olarak ne yaptığını söylemek zor; ama genel bir fikrimiz var: ilk katmanlar daha alt düzey özellikleri ve örüntüleri, sonraki katmanlar daha üst düzey soyutlamaları ve ilişkileri öğrenmeye yatkındır. Dil açısından, alt katmanlar dil bilgisini, sözdizimini ve basit kelime ilişkilerini; üst katmanlar ise daha karmaşık anlam ilişkilerini, metnin yapısını ve bağlama bağlı anlamı yakalıyor olabilir.

`;

}
