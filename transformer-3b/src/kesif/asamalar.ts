// TR: Mimari yolculuğu: seçili parçanın modelin içinden geçtiği 19 adım.
// 0–2 giriş, 3–14 bir bloğun içi (12 blokta aynı), 15–18 çıkış.
import { L } from '@/src/llm/tr/dil';

export type Grup = 'giris' | 'blok' | 'cikis';
export interface IAsama { ad: string; kisa: string; grup: Grup }

export const ASAMALAR: IAsama[] = [
    { grup: 'giris', ad: L('Parça numarası', 'Token id'), kisa: L('Parça', 'Token') },
    { grup: 'giris', ad: L('Gömme tablosu', 'Embedding table'), kisa: L('Gömme', 'Embed') },
    { grup: 'giris', ad: L('Konum eklenir', 'Position added'), kisa: L('Konum', 'Position') },

    { grup: 'blok', ad: L('Katman normu 1', 'Layer norm 1'), kisa: L('Norm', 'Norm') },
    { grup: 'blok', ad: L('Q, K, V', 'Q, K, V'), kisa: 'Q K V' },
    { grup: 'blok', ad: L('Dikkat skorları', 'Attention scores'), kisa: L('Skor', 'Score') },
    { grup: 'blok', ad: L('Softmax: dikkat payları', 'Softmax: attention weights'), kisa: 'Softmax' },
    { grup: 'blok', ad: L("V'lerin ağırlıklı toplamı", 'Weighted sum of V'), kisa: L('V topla', 'Sum V') },
    { grup: 'blok', ad: L('12 baş birleşir', '12 heads combined'), kisa: L('Birleş', 'Merge') },
    { grup: 'blok', ad: L('Artık bağlantı 1', 'Residual add 1'), kisa: L('+ Artık', '+ Resid.') },
    { grup: 'blok', ad: L('Katman normu 2', 'Layer norm 2'), kisa: L('Norm', 'Norm') },
    { grup: 'blok', ad: L('MLP: genişlet', 'MLP: expand'), kisa: L('Genişlet', 'Expand') },
    { grup: 'blok', ad: 'GELU', kisa: 'GELU' },
    { grup: 'blok', ad: L('MLP: daralt', 'MLP: project'), kisa: L('Daralt', 'Project') },
    { grup: 'blok', ad: L('Artık bağlantı 2', 'Residual add 2'), kisa: L('+ Artık', '+ Resid.') },

    { grup: 'cikis', ad: L('Son norm', 'Final norm'), kisa: L('Son norm', 'Final norm') },
    { grup: 'cikis', ad: L('Logitler', 'Logits'), kisa: 'Logit' },
    { grup: 'cikis', ad: L('Sıcaklık ve softmax', 'Temperature & softmax'), kisa: L('Olasılık', 'Prob.') },
    { grup: 'cikis', ad: L('Seçim', 'Choice'), kisa: L('Seçim', 'Choice') },
];

export const ILK_BLOK_ADIMI = 3, SON_BLOK_ADIMI = 14, ADIM_SAYISI = ASAMALAR.length;
export const blokAdimiMi = (a: number) => a >= ILK_BLOK_ADIMI && a <= SON_BLOK_ADIMI;

/** "Baştan sona oynat" sırası: giriş, ilk blok ayrıntılı, kalan bloklar hızlı (yalnızca çıkışları), çıkış */
export function oynatmaSirasi(nL: number): { adim: number; blok: number; hizli?: boolean }[] {
    let s: { adim: number; blok: number; hizli?: boolean }[] = [];
    for (let a = 0; a < ILK_BLOK_ADIMI; a++) s.push({ adim: a, blok: 0 });
    for (let a = ILK_BLOK_ADIMI; a <= SON_BLOK_ADIMI; a++) s.push({ adim: a, blok: 0 });
    for (let l = 1; l < nL; l++) s.push({ adim: SON_BLOK_ADIMI, blok: l, hizli: true });
    for (let a = SON_BLOK_ADIMI + 1; a < ADIM_SAYISI; a++) s.push({ adim: a, blok: nL - 1 });
    return s;
}
