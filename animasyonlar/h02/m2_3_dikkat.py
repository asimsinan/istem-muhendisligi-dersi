"""M2.3 — Dikkat: "Ali kitabı Ayşe'ye verdi çünkü o…" — "o"dan önceki kelimelere yaylar;
kalınlık = dikkat ağırlığı; "o"nun vektörü bu ağırlıklarla güncellenir (~50 sn). Ağırlıklar şematiktir.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_3_dikkat.py Dikkat h02-m2.3-dikkat
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, ArcBetweenPoints, Rectangle, Arrow, FadeIn, FadeOut, Create, LaggedStart, Indicate,
    TransformFromCopy, ReplacementTransform, UP, DOWN, LEFT, RIGHT, PI, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT, PASIF,
    KART, NOTR_KART,
)

KELIMELER = ["Ali", "kitabı", "Ayşe'ye", "verdi", "çünkü", "o"]
AGIRLIK = [0.38, 0.08, 0.34, 0.07, 0.13]  # "o"dan öncekilere (toplam 1)


def kelime_karti(metin, vurgu=False):
    t = yazi(metin, boyut=34, renk_=KART if vurgu else METIN, kalin=vurgu)
    k = kart(t.width + 0.5, 0.85, dolgu=KIRMIZI if vurgu else KART, kenar=KIRMIZI if vurgu else CIZGI,
             kalinlik=2, yaricap=0.14)
    t.move_to(k)
    return VGroup(k, t)


def serit(renkler, genislik=0.3):
    g = VGroup(*[Rectangle(width=genislik, height=0.36, stroke_color=CIZGI, stroke_width=1,
                           fill_color=r, fill_opacity=1) for r in renkler]).arrange(RIGHT, buff=0)
    return g


class Dikkat(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.3")
        Y = -0.55

        # 1) Cümle
        kartlar = VGroup(*[kelime_karti(k) for k in KELIMELER]).arrange(RIGHT, buff=0.3).move_to([0, Y, 0])
        self.play(LaggedStart(*[FadeIn(k, shift=UP * 0.15) for k in kartlar], lag_ratio=0.15), run_time=1.6)
        uc_nokta = yazi("…", boyut=34, renk_=PASIF).next_to(kartlar, RIGHT, buff=0.2)
        self.play(FadeIn(uc_nokta), run_time=0.4)
        self.wait(0.8)

        o_vurgu = kelime_karti("o", vurgu=True).move_to(kartlar[-1])
        soru = yazi("“o” kim?", boyut=28, renk_=KIRMIZI, kalin=True).next_to(o_vurgu, DOWN, buff=0.45)
        self.play(ReplacementTransform(kartlar[-1], o_vurgu), FadeIn(soru, shift=UP * 0.1), run_time=0.8)
        kartlar = VGroup(*kartlar[:-1], o_vurgu)
        self.wait(1.4)

        # 2) Yaylar: kalınlık = ağırlık
        yaylar, yuzdeler = VGroup(), VGroup()
        bas = o_vurgu.get_top() + UP * 0.05
        for i, w in enumerate(AGIRLIK):
            hedef = kartlar[i].get_top() + UP * 0.05
            yay = ArcBetweenPoints(bas, hedef, angle=PI * 0.62,
                                   stroke_width=2 + 46 * w,
                                   color=interpolate_color(KIRMIZI_ACIK, KIRMIZI, min(1, w * 2.6)))
            yay.set_stroke(opacity=0.9)
            yaylar.add(yay)
            ayak = yay.point_from_proportion(0.86)
            y = yazi(f"%{round(w * 100)}", boyut=22, renk_=KIRMIZI if w > 0.2 else METIN_IKINCIL,
                     kalin=w > 0.2)
            y.next_to(ayak, LEFT, buff=0.12)
            yuzdeler.add(y)
        self.play(LaggedStart(*[Create(y) for y in yaylar], lag_ratio=0.2), run_time=3.0)
        self.play(LaggedStart(*[FadeIn(y) for y in yuzdeler], lag_ratio=0.1), run_time=1.0)
        lejant = yazi("yayın kalınlığı = dikkat ağırlığı", boyut=20, renk_=METIN_IKINCIL).to_corner(UP + RIGHT, buff=0.45)
        self.play(FadeIn(lejant), run_time=0.5)
        self.wait(2.0)
        self.play(Indicate(kartlar[0], color=KIRMIZI, scale_factor=1.08),
                  Indicate(kartlar[2], color=KIRMIZI, scale_factor=1.08), run_time=1.2)
        self.wait(2.4)

        geri = yazi("“o” yalnızca kendinden öncekilere bakabilir; sonrası henüz yok.", boyut=22,
                    renk_=METIN_IKINCIL).next_to(soru, DOWN, buff=0.3).set_x(0)  # ortada: "o"nun altında taşıyordu
        self.play(FadeIn(geri), run_time=0.6)
        self.wait(3.2)

        # 3) "o"nun vektörü güncellenir: ağırlıklı karışım
        self.play(FadeOut(geri), FadeOut(soru), run_time=0.5)
        renk_ali = [interpolate_color(KART, KIRMIZI, v) for v in [0.9, 0.2, 0.7, 0.1, 0.5, 0.8, 0.3, 0.6]]
        renk_ayse = [interpolate_color(KART, KARSIT, v) for v in [0.3, 0.8, 0.2, 0.9, 0.4, 0.2, 0.7, 0.5]]
        renk_o_eski = [interpolate_color(KART, PASIF, v) for v in [0.4] * 8]
        renk_o_yeni = [interpolate_color(interpolate_color(a, b, 0.47), c, 0.25)
                       for a, b, c in zip(renk_ali, renk_ayse, renk_o_eski)]
        s_ali = serit(renk_ali).next_to(kartlar[0], DOWN, buff=0.45)
        s_ayse = serit(renk_ayse).next_to(kartlar[2], DOWN, buff=0.45)
        s_o = serit(renk_o_eski).next_to(kartlar[-1], DOWN, buff=0.45)
        vek_not = yazi("her kelimenin vektörü", boyut=18, renk_=METIN_IKINCIL).next_to(s_ali, DOWN, buff=0.12)
        self.play(FadeIn(s_ali), FadeIn(s_ayse), FadeIn(s_o), FadeIn(vek_not), run_time=0.8)
        self.wait(0.8)
        s_o_yeni = serit(renk_o_yeni).move_to(s_o)
        self.play(TransformFromCopy(s_ali, s_o_yeni), TransformFromCopy(s_ayse, s_o_yeni.copy()),
                  FadeOut(s_o), run_time=1.6)
        yeni_not = yazi("“o”nun yeni vektörü: Ali ve Ayşe'den bilgi taşıyor", boyut=20, renk_=KIRMIZI,
                        kalin=True).next_to(s_o_yeni, DOWN, buff=0.15)
        yeni_not.align_to(s_o_yeni, RIGHT)
        self.play(FadeIn(yeni_not, shift=UP * 0.1), run_time=0.7)
        self.wait(3.5)

        ozet = VGroup(
            yazi("Her token önceki token'lara farklı oranda “kulak verir”", boyut=26, renk_=METIN),
            yazi("ve kendi vektörünü bu karışımla günceller. Bu, her katmanda ve her başta tekrar eder.",
                 boyut=22, renk_=METIN_IKINCIL),
        ).arrange(DOWN, buff=0.16).move_to([0, -3.0, 0])
        sema = yazi("ağırlıklar şematik", boyut=16, renk_=PASIF).to_corner(DOWN + RIGHT, buff=0.35)
        self.play(FadeIn(ozet, shift=UP * 0.1), FadeIn(sema), run_time=0.9)
        self.wait(8.0)
