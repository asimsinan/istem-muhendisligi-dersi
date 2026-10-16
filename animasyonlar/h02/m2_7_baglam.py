"""M2.7 — Bağlam penceresi (~55 sn).

Pencere = modelin bir seferde görebildiği en fazla token. İçine sistem talimatı, sohbet geçmişi, yapıştırılan
belge, yeni soru ve modelin cevabı birlikte sığmak zorunda. Sığmayınca: API isteği reddeder; sohbet
uygulamaları eski mesajları kırpar ya da özetler. Türkçe aynı anlam için ~1,5 kat token tutar (o200k,
bugünün sorusundaki cümle çifti: 26 / 17). Boyutlar: ders sitesindeki Türkçe GPT-2 1.024 token; güncel büyük
modeller yüz binlerce, bazıları ~1 milyon. Animasyondaki 24 kutuluk pencere şematiktir.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_7_baglam.py Baglam h02-m2.7-baglam
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, FadeIn, FadeOut, LaggedStart, ReplacementTransform, Create, UP, DOWN, LEFT, RIGHT,
    interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

N = 24
KUTU = 0.44
X0 = -(N * KUTU) / 2
Y_PENCERE = 1.0

RENK = {
    "sistem": PASIF,
    "gecmis": interpolate_color(KARSIT, KART, 0.35),
    "belge": interpolate_color(KIRMIZI, KART, 0.6),
    "soru": KARSIT,
    "cevap": KIRMIZI,
}
AD = {"sistem": "sistem talimatı", "gecmis": "sohbet geçmişi", "belge": "yapıştırılan belge",
      "soru": "yeni soru", "cevap": "modelin cevabı"}


def token_kutu(tur, i, y=Y_PENCERE):
    r = Rectangle(width=KUTU * 0.86, height=0.5, stroke_width=0, fill_color=RENK[tur], fill_opacity=1)
    r.move_to([X0 + KUTU * (i + 0.5), y, 0])
    return r


class Baglam(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.7")

        # 1) Pencere
        cerceve = Rectangle(width=N * KUTU + 0.16, height=0.78, stroke_color=METIN, stroke_width=3).move_to([0, Y_PENCERE, 0])
        yuvalar = VGroup(*[Rectangle(width=KUTU * 0.86, height=0.5, stroke_color=CIZGI, stroke_width=1.5, fill_opacity=0)
                           .move_to([X0 + KUTU * (i + 0.5), Y_PENCERE, 0]) for i in range(N)])
        baslik = yazi("Bağlam penceresi: modelin bir seferde görebildiği en fazla token", boyut=26, renk_=METIN, kalin=True).move_to([0, 2.9, 0])
        alt = yazi(f"(örnek pencere: {N} token; her kutu bir token)", boyut=19, renk_=METIN_IKINCIL).next_to(baslik, DOWN, buff=0.12)
        self.play(FadeIn(baslik), FadeIn(alt), Create(cerceve), LaggedStart(*[FadeIn(y) for y in yuvalar], lag_ratio=0.02), run_time=1.4)
        self.wait(1.2)

        # 2) Doldur: sistem 3, geçmiş 6, belge 9, soru 2, cevap 4 = 24
        parcalar = [("sistem", 3), ("gecmis", 6), ("belge", 9), ("soru", 2), ("cevap", 4)]
        lejant = VGroup()
        kutular = []
        i = 0
        for tur, n in parcalar:
            grup = VGroup(*[token_kutu(tur, i + j) for j in range(n)])
            i += n
            kutular.append((tur, grup))
            et = VGroup(Rectangle(width=0.3, height=0.3, stroke_width=0, fill_color=RENK[tur], fill_opacity=1),
                        yazi(f"{AD[tur]} · {n}", boyut=19, renk_=METIN)).arrange(RIGHT, buff=0.12)
            lejant.add(et)
        lejant.arrange_in_grid(rows=2, buff=(0.45, 0.15), cell_alignment=LEFT).move_to([0, -0.15, 0])
        for (tur, grup), et in zip(kutular, lejant):
            self.play(LaggedStart(*[FadeIn(k, shift=DOWN * 0.15) for k in grup], lag_ratio=0.08), FadeIn(et), run_time=0.8 if tur != "cevap" else 1.0)
            if tur == "cevap":
                n1 = yazi("Modelin yazacağı cevap da pencereye sığmak zorunda.", boyut=24, renk_=KIRMIZI_KOYU, kalin=True).move_to([0, -1.15, 0])
                self.play(FadeIn(n1), run_time=0.5)
        self.wait(2.2)

        # 3) Taşma: yeni bir belge daha
        yeni = VGroup(*[token_kutu("belge", N - 5 + j, y=Y_PENCERE + 0.95) for j in range(5)])
        n2 = yazi("Yeni bir mesaj daha: 5 token sığmıyor.", boyut=24, renk_=METIN).move_to([0, -1.15, 0])
        self.play(FadeIn(yeni, shift=DOWN * 0.2), ReplacementTransform(n1, n2), run_time=0.8)
        self.wait(1.4)
        secenek = VGroup(
            yazi("API: istek reddedilir (“bağlam çok uzun” hatası).", boyut=22, renk_=METIN),
            yazi("Sohbet uygulaması: en eski mesajlar kırpılır ya da özetlenir; model onları artık görmez.", boyut=22, renk_=METIN),
        ).arrange(DOWN, buff=0.14, aligned_edge=LEFT).move_to([0, -1.95, 0])
        self.play(FadeIn(secenek[0]), run_time=0.5)
        self.wait(1.2)
        self.play(FadeIn(secenek[1]), run_time=0.5)
        # en eski 5 token (sistem dışındaki geçmişten) dışarı kayar, kalanlar sola kayar, yeni girer
        gecmis = kutular[1][1]
        atilan = VGroup(*gecmis[:5])
        self.play(atilan.animate.shift(UP * 1.0).set_opacity(0.15), run_time=0.7)
        kalan = VGroup(*gecmis[5:], *kutular[2][1], *kutular[3][1], *kutular[4][1])
        self.play(kalan.animate.shift(LEFT * KUTU * 5), yeni.animate.shift(DOWN * 0.95), FadeOut(atilan), run_time=1.0)
        unut = yazi("unutuldu", boyut=18, renk_=PASIF).move_to([X0 + KUTU * 5.5, Y_PENCERE + 0.75, 0])
        self.play(FadeIn(unut), run_time=0.4)
        self.wait(2.6)

        # 4) Türkçe aynı pencereye daha az sığar
        self.play(FadeOut(VGroup(*[g for _, g in kutular[2:]], gecmis[5:], *kutular[0][1], yeni, unut, n2, secenek, lejant, cerceve, yuvalar, alt)), run_time=0.7)
        b2 = yazi("Aynı anlam, farklı uzunluk (GPT'nin güncel sözlüğü)", boyut=24, renk_=METIN_IKINCIL, kalin=True).move_to([0, 1.9, 0])
        en = VGroup(yazi("İngilizce", boyut=22, renk_=METIN), VGroup(*[Rectangle(width=0.3, height=0.42, stroke_width=0, fill_color=KARSIT, fill_opacity=1) for _ in range(17)]).arrange(RIGHT, buff=0.05),
                    yazi("17 token", boyut=22, renk_=KARSIT, kalin=True)).arrange(RIGHT, buff=0.3)
        tr = VGroup(yazi("Türkçe", boyut=22, renk_=METIN), VGroup(*[Rectangle(width=0.3, height=0.42, stroke_width=0, fill_color=KIRMIZI, fill_opacity=1) for _ in range(26)]).arrange(RIGHT, buff=0.05),
                    yazi("26 token", boyut=22, renk_=KIRMIZI, kalin=True)).arrange(RIGHT, buff=0.3)
        satir = VGroup(en, tr).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to([0, 0.8, 0])
        self.play(ReplacementTransform(baslik, b2), FadeIn(en), run_time=0.7)
        self.play(FadeIn(tr), run_time=0.7)
        n3 = yazi("Türkçe metin pencereye yaklaşık 1,5 kat daha az sığar.", boyut=24, renk_=METIN).move_to([0, -0.4, 0])
        self.play(FadeIn(n3), run_time=0.5)
        self.wait(2.4)

        # 5) Gerçek boyutlar
        boy = VGroup(
            VGroup(yazi("1.024", boyut=40, renk_=KARSIT, kalin=True), yazi("token · ders sitesindeki Türkçe GPT-2", boyut=22, renk_=METIN)).arrange(RIGHT, buff=0.25, aligned_edge=DOWN),
            VGroup(yazi("yüz binlerce", boyut=40, renk_=KIRMIZI, kalin=True), yazi("token · güncel büyük modeller (bazıları ~1 milyon)", boyut=22, renk_=METIN)).arrange(RIGHT, buff=0.25, aligned_edge=DOWN),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([0, -1.95, 0])
        self.play(LaggedStart(*[FadeIn(b, shift=UP * 0.1) for b in boy], lag_ratio=0.4), run_time=1.2)
        self.wait(1.6)
        son = yazi("Pencere büyük olsa da uzun metinde dikkat dağılır: Hafta 6.", boyut=22, renk_=METIN_IKINCIL).move_to([0, -3.05, 0])
        self.play(FadeIn(son), run_time=0.6)
        self.wait(6.0)
