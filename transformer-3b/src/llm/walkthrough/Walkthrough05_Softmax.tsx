import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, IWalkthroughArgs, setInitialCamera, setInitialCameraBlk } from "./WalkthroughTools";

export function walkthrough05_Softmax(args: IWalkthroughArgs) {
    let { walkthrough: wt, state } = args;

    if (wt.phase !== Phase.Input_Detail_Softmax) {
        return;
    }

    setInitialCameraBlk(state, state.layout.logitsSoftmax, new Vec3(283.100, 8.000, 26)); // TR: çıktı bölgesine doğrudan bak

    let c0 = commentary(wt, null, 0)`

Softmax işlemi, önceki bölümde gördüğümüz gibi öz dikkatin bir parçasıdır; modelin en sonunda da yeniden karşımıza çıkacak.

Amacı bir vektörü, değerlerinin toplamı 1,0 olacak şekilde normalleştirmektir. Ama bu, değerleri toplama bölmek kadar basit değil. Önce her değerin üsteli alınır:

  a = exp(x_1)

Bu, bütün değerleri pozitif yapar. Üsteli alınmış değerlerden oluşan vektörü elde edince her değeri bunların toplamına böleriz; böylece toplam 1,0 olur. Üstelli değerlerin hepsi pozitif olduğu için sonuçlar 0,0 ile 1,0 arasında kalır: elimizde özgün değerler üzerinde bir olasılık dağılımı vardır.

Softmax bu kadar: değerlerin üstelini al, sonra toplama böl.

Küçük bir sorun var: girdi değerlerinden biri çok büyükse üsteli devasa olur. Büyük bir sayıyı daha da büyük bir sayıya bölmek, bilgisayarın ondalıklı sayı aritmetiğinde hatalara yol açabilir.

Softmax'ın işe yarar bir özelliği var: bütün girdi değerlerine aynı sabiti eklersek sonuç değişmez. Bu yüzden vektördeki en büyük değeri bulup bütün değerlerden çıkarırız. En büyük değer 0,0 olur ve hesap sayısal olarak kararlı kalır.

Softmax'a öz dikkat katmanı içinde bakalım. Her softmax işleminin girdisi, öz dikkat matrisinin bir satırıdır (yalnızca köşegene kadar olan kısmı).

Katman normalizasyonunda olduğu gibi, işi verimli tutmak için bazı özet değerleri bir ara adımda saklarız.

Her satır için satırdaki en büyük değeri ve kaydırılıp üsteli alınmış değerlerin toplamını saklarız. Sonra çıktı satırını birkaç küçük işlemle üretiriz: en büyük değeri çıkar, üstelini al, toplama böl.

Peki adı neden "softmax"? Bu işlemin "sert" (hard) hâli argmax'tır: en büyük değeri bulur, onu 1,0, diğer hepsini 0,0 yapar. Softmax bunun "yumuşak" hâlidir. Üstel alma sayesinde en büyük değer öne çıkar ve 1,0'a doğru itilir; ama diğer seçenekler de olasılıklarıyla birlikte korunur. Böylece yalnızca en olası seçenek değil, diğerlerinin göreli olasılığı da temsil edilir. Modelin sonundaki sıcaklık (temperature) ayarı da bu adımda devreye girer.
`;

}
