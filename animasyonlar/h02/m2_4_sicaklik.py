"""M2.4 — Sıcaklık: olasılık çubukları T düşünce sivrilir, yükselince yayılır (~45 sn).

Adaylar ve logit'ler V2.2 Sıcaklık sayfasıyla aynı ("Isparta'nın en meşhur ürünü …").
olasılık_i = exp(logit_i / T) / Σ exp(logit_j / T)

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_4_sicaklik.py Sicaklik h02-m2.4-sicaklik
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, Line, Dot, ValueTracker, always_redraw, FadeIn, FadeOut, LaggedStart,
    UP, DOWN, LEFT, RIGHT, linear, smooth, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT, PASIF,
    KART, NOTR_KART,
)

ADAYLAR = [("gül", 3.2), ("elma", 2.6), ("halı", 1.9), ("lavanta", 1.5),
           ("kiraz", 0.9), ("kilim", 0.4), ("kalem", -0.8), ("deniz", -1.6)]


def olasiliklar(T):
    e = [math.exp(l / T) for _, l in ADAYLAR]
    s = sum(e)
    return [x / s for x in e]


def yuzde(p):
    if p < 0.001:
        return "%0"
    if p < 0.01:
        return "<%1"
    return f"%{p * 100:.0f}"


def grafik(T, x0, y0, satir=0.58, olcek=7.0, etiket_boyut=26, yuzde_boyut=22, ad_genislik=2.0, vurgu_ilk=True):
    ps = olasiliklar(T)
    g = VGroup()
    for i, ((ad, _), p) in enumerate(zip(ADAYLAR, ps)):
        y = y0 - i * satir
        et = yazi(ad, boyut=etiket_boyut, renk_=METIN).move_to([x0, y, 0], aligned_edge=RIGHT)
        w = max(p * olcek, 0.02)
        cubuk = Rectangle(width=w, height=satir * 0.62, stroke_width=0,
                          fill_color=KIRMIZI if (i == 0 and vurgu_ilk) else interpolate_color(KARSIT, KART, 0.45),
                          fill_opacity=1).move_to([x0 + 0.25, y, 0], aligned_edge=LEFT)
        yz = yazi(yuzde(p), boyut=yuzde_boyut, renk_=METIN_IKINCIL).next_to(cubuk, RIGHT, buff=0.15)
        g.add(VGroup(et, cubuk, yz))
    return g


class Sicaklik(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.4")
        T = ValueTracker(1.0)

        istem = VGroup(yazi("Isparta'nın en meşhur ürünü", boyut=30, renk_=METIN),
                       yazi("___", boyut=30, renk_=KIRMIZI, kalin=True)).arrange(RIGHT, buff=0.2)
        istem.move_to([-1.6, 3.2, 0])
        aday_not = yazi("sıradaki kelime için adaylar ve olasılıkları", boyut=19, renk_=METIN_IKINCIL)
        aday_not.next_to(istem, DOWN, buff=0.14).align_to(istem, LEFT)
        self.play(FadeIn(istem), FadeIn(aday_not), run_time=0.8)

        cizim = always_redraw(lambda: grafik(T.get_value(), -3.6, 1.75))
        self.play(FadeIn(cizim), run_time=1.0)

        # Sıcaklık göstergesi (sağda dikey değil, yatay ölçek)
        TMIN, TMAX = 0.2, 2.0
        olcek_cizgi = Line([2.6, -3.0, 0], [6.4, -3.0, 0], stroke_color=CIZGI, stroke_width=6)
        def tx(t):
            return 2.6 + (t - TMIN) / (TMAX - TMIN) * 3.8
        uclar = VGroup(yazi("0,2", boyut=18, renk_=PASIF).next_to(olcek_cizgi, DOWN, buff=0.12).align_to(olcek_cizgi, LEFT),
                       yazi("2,0", boyut=18, renk_=PASIF).next_to(olcek_cizgi, DOWN, buff=0.12).align_to(olcek_cizgi, RIGHT))
        imlec = always_redraw(lambda: Dot([tx(T.get_value()), -3.0, 0], radius=0.15, color=KIRMIZI))
        deger = always_redraw(lambda: yazi(f"Sıcaklık: {T.get_value():.1f}".replace(".", ","), boyut=28,
                                           renk_=KIRMIZI, kalin=True).next_to(olcek_cizgi, UP, buff=0.25))
        self.play(FadeIn(olcek_cizgi), FadeIn(uclar), FadeIn(imlec), FadeIn(deger), run_time=0.8)
        self.wait(2.0)

        def aciklama(metin):
            return yazi(metin, boyut=24, renk_=METIN).move_to([-6.3, -3.0, 0], aligned_edge=LEFT)

        # Düşük sıcaklık
        a1 = aciklama("Düşük: en olası aday iyice öne çıkar")
        self.play(T.animate.set_value(0.2), FadeIn(a1), run_time=3.5, rate_func=smooth)
        self.wait(4.5)
        # Yüksek sıcaklık
        a2 = aciklama("Yüksek: çubuklar birbirine yaklaşır")
        self.play(T.animate.set_value(1.6), FadeOut(a1), FadeIn(a2), run_time=4.0, rate_func=smooth)
        self.wait(4.5)
        a3 = aciklama("Dengeli: 0,8")
        self.play(T.animate.set_value(0.8), FadeOut(a2), FadeIn(a3), run_time=2.0, rate_func=smooth)
        self.wait(2.5)

        # Son kare: üç sıcaklık yan yana
        self.play(FadeOut(cizim), FadeOut(olcek_cizgi), FadeOut(uclar), FadeOut(imlec), FadeOut(deger),
                  FadeOut(a3), FadeOut(aday_not), run_time=0.8)
        self.remove(cizim, imlec, deger)
        paneller = VGroup()
        for i, t in enumerate([0.2, 0.8, 1.6]):
            x0 = -5.0 + i * 4.6
            g = grafik(t, x0, 1.7, satir=0.5, olcek=2.4, etiket_boyut=20, yuzde_boyut=16)
            b = yazi(f"Sıcaklık {t:.1f}".replace(".", ","), boyut=24, renk_=KIRMIZI, kalin=True)
            b.move_to([x0 + 0.6, 2.35, 0])
            paneller.add(VGroup(b, g))
        self.play(LaggedStart(*[FadeIn(p, shift=UP * 0.15) for p in paneller], lag_ratio=0.25), run_time=1.6)
        ozet = VGroup(
            yazi("Sıcaklık modelin bilgisini değiştirmez;", boyut=26, renk_=METIN),
            yazi("seçimin ne kadar cesur olacağını ayarlar.", boyut=26, renk_=METIN),
        ).arrange(DOWN, buff=0.14).move_to([0, -2.85, 0])
        self.play(FadeIn(ozet, shift=UP * 0.1), run_time=0.8)
        self.wait(8.0)
