"""M3.3 — Önek önbellekleme (prefix caching) (~30 sn).

100 yorum: her istek aynı uzun önekle (sistem + örnekler, örnek ≈ 1.200 token) başlar, yalnızca yorum (≈ 40 token)
değişir. İlk istekte önek normal fiyattan; sonrakilerde önbellekten okunur (örnek oran: normal girdi fiyatının
0,25'i; gerçek oran sağlayıcıya göre ~0,1–0,5). Değişen bir şey (tarih) başa konursa önek bozulur, önbellek çalışmaz.
Sayılar örnek.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h03/m3_3_onbellek.py Onbellek h03-m3.3-onbellek
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, FadeIn, FadeOut, LaggedStart, ReplacementTransform, Transform, GrowFromEdge,
    UP, DOWN, LEFT, RIGHT, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

ONEK = 1200
YORUM = 40
ORAN = 0.25
OLCEK = 6.2 / (ONEK + YORUM)     # birim → genişlik
X0 = -3.4
ONEK_RENK = KARSIT
ONBELLEK_RENK = interpolate_color(KARSIT, KART, 0.72)
YORUM_RENK = KIRMIZI


def istek_satiri(y, ad, onbellekten, yorum_ad, bozuk=False):
    et = yazi(ad, boyut=22, renk_=METIN, kalin=True).move_to([X0 - 0.3, y, 0], aligned_edge=RIGHT)
    ow = ONEK * OLCEK
    parcalar = VGroup()
    if bozuk:
        tarih = Rectangle(width=0.32, height=0.6, stroke_width=0, fill_color=KIRMIZI, fill_opacity=1).move_to([X0, y, 0], aligned_edge=LEFT)
        govde = Rectangle(width=ow - 0.32, height=0.6, stroke_width=0, fill_color=ONEK_RENK, fill_opacity=1).next_to(tarih, RIGHT, buff=0)
        parcalar.add(tarih, govde)
    else:
        govde = Rectangle(width=ow, height=0.6, stroke_width=0, fill_color=ONBELLEK_RENK if onbellekten else ONEK_RENK,
                          fill_opacity=1).move_to([X0, y, 0], aligned_edge=LEFT)
        parcalar.add(govde)
    on_yazi = yazi("sistem + örnekler · 1.200 token" + (" · önbellekten" if onbellekten else ""), boyut=17,
                   renk_=KARSIT if onbellekten else KART, kalin=True).move_to(govde)
    yr = Rectangle(width=max(YORUM * OLCEK, 0.28), height=0.6, stroke_width=0, fill_color=YORUM_RENK, fill_opacity=1) \
        .next_to(parcalar, RIGHT, buff=0.04)
    yy = yazi(yorum_ad, boyut=15, renk_=KIRMIZI_KOYU, kalin=True).next_to(yr, UP, buff=0.06)
    return VGroup(et, parcalar, on_yazi, yr, yy)


def maliyet_cubugu(y, birim, renk_=KIRMIZI):
    w = birim * OLCEK * 0.55
    r = Rectangle(width=w, height=0.3, stroke_width=0, fill_color=renk_, fill_opacity=1).move_to([X0, y, 0], aligned_edge=LEFT)
    t = yazi(f"girdi maliyeti ≈ {birim:,.0f} birim".replace(",", "."), boyut=17, renk_=METIN_IKINCIL).next_to(r, RIGHT, buff=0.15)
    return VGroup(r, t)


class Onbellek(DersSahnesi):
    def construct(self):
        self.kunye(3, "M3.3")
        bas = yazi("100 yorum, 100 istek: başlangıç hep aynı", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to([0, 3.3, 0])
        self.play(FadeIn(bas), run_time=0.5)

        # İstek 1
        r1 = istek_satiri(2.2, "İstek 1", False, "yorum 1")
        m1 = maliyet_cubugu(1.62, ONEK + YORUM, renk_=KARSIT)
        self.play(FadeIn(r1[0]), GrowFromEdge(r1[1], LEFT), FadeIn(r1[2]), run_time=0.8)
        self.play(FadeIn(r1[3]), FadeIn(r1[4]), run_time=0.4)
        self.play(FadeIn(m1), run_time=0.5)
        n = yazi("İlk istek: önek normal fiyattan okunur ve önbelleğe alınır.", boyut=22, renk_=METIN).move_to([0, -2.75, 0])
        self.play(FadeIn(n), run_time=0.4)
        self.wait(2.5)

        # İstek 2
        r2 = istek_satiri(0.75, "İstek 2", True, "yorum 2")
        birim2 = ONEK * ORAN + YORUM
        m2 = maliyet_cubugu(0.17, birim2)
        n2 = yazi("Aynı önek: önbellekten, çok daha ucuza. Yalnızca yorum yeni.", boyut=22, renk_=METIN).move_to(n)
        self.play(FadeIn(r2[0]), GrowFromEdge(r2[1], LEFT), FadeIn(r2[2]), ReplacementTransform(n, n2), run_time=0.8)
        self.play(FadeIn(r2[3]), FadeIn(r2[4]), run_time=0.4)
        self.play(GrowFromEdge(m2[0], LEFT), FadeIn(m2[1]), run_time=0.6)
        self.wait(3.5)

        # İstek 3: tarih başa konmuş → önbellek bozulur
        r3 = istek_satiri(-0.7, "İstek 3", False, "yorum 3", bozuk=True)
        tarih_et = yazi("tarih başa eklendi", boyut=15, renk_=KIRMIZI_KOYU, kalin=True).next_to(r3[1][0], DOWN, buff=0.08).align_to(r3[1][0], LEFT)
        m3 = maliyet_cubugu(-1.38, ONEK + YORUM, renk_=KARSIT)
        m3.shift(DOWN * 0.08)
        n3 = yazi("Başta bir şey değişirse önek bozulur: önbellek çalışmaz.", boyut=22, renk_=KIRMIZI_KOYU, kalin=True).move_to(n)
        self.play(FadeIn(r3[0]), GrowFromEdge(r3[1], LEFT), FadeIn(r3[2]), FadeIn(tarih_et), ReplacementTransform(n2, n3), run_time=0.8)
        self.play(FadeIn(r3[3]), FadeIn(r3[4]), run_time=0.4)
        self.play(GrowFromEdge(m3[0], LEFT), FadeIn(m3[1]), run_time=0.6)
        self.wait(3.5)

        kural = VGroup(yazi("Sabit kısım başa, değişen kısım sona.", boyut=28, renk_=METIN, kalin=True),
                       yazi("Örnekte önbellek, normal girdi fiyatının 0,25'i; gerçekte sağlayıcıya göre 0,1–0,5", boyut=20, renk_=METIN_IKINCIL)) \
            .arrange(DOWN, buff=0.12).move_to([0, -2.85, 0])
        self.play(ReplacementTransform(n3, kural), run_time=0.8)
        self.wait(8.0)
