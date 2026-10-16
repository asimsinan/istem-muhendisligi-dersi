"""M1.1 — İç içe dört halka: YZ ⊃ makine öğrenmesi ⊃ derin öğrenme ⊃ üretken YZ (~30 sn).

Render (proje kökünden):
  manim -qh animasyonlar/h01/m1_1_ic_ice_kumeler.py IcIceKumeler
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Circle, Sector, Line, DashedLine, Create, FadeIn, FadeOut, Write, Indicate,
    TransformFromCopy, LaggedStart, UP, DOWN, LEFT, RIGHT, PI, smooth,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kart, KIRMIZI, KIRMIZI_KOYU, METIN, NOTR_KART, METIN_IKINCIL,
    CIZGI, KARSIT, PASIF, KART, ZEMIN,
)

# (ad, örnek) — slayt 11'deki tabloyla aynı örnekler
HALKALAR = [
    ("Yapay zekâ", "Satranç oynayan program"),
    ("Makine öğrenmesi", "E-posta spam filtresi"),
    ("Derin öğrenme", "Telefonda yüz tanıma"),
    ("Üretken YZ", "ChatGPT, görsel üreticiler"),
]
# Halkalar alt kenara yaslanır; etiket her halkanın üst iç kısmında durur
YARICAP = [3.25, 2.5, 1.8, 1.1]
TABAN_Y = -3.35
TABAN_ARALIK = 0.2  # iç halkalar alt kenarda dışarıdakine değmesin
MERKEZ_X = -3.1


def halka(i: int) -> Circle:
    r = YARICAP[i]
    dolgu = [ZEMIN, KART, NOTR_KART, KIRMIZI][i]
    kenar = [KARSIT, KARSIT, KARSIT, KIRMIZI][i]
    c = Circle(radius=r, fill_color=dolgu, fill_opacity=1, stroke_color=kenar, stroke_width=3)
    c.move_to([MERKEZ_X, TABAN_Y + i * TABAN_ARALIK + r, 0])
    return c


def halka_etiketi(i: int, c: Circle):
    renk_ = KART if i == 3 else (KARSIT if i < 3 else KIRMIZI)
    e = yazi(HALKALAR[i][0], boyut=20 if i in (1, 2) else 22, renk_=renk_, kalin=True)
    ust = c.get_top()
    e.move_to([ust[0], ust[1] - (0.62 if i < 3 else c.radius), 0])
    return e


def ornek_satiri(i: int):
    ad, ornek = HALKALAR[i]
    nokta = Circle(radius=0.11, fill_color=KIRMIZI if i == 3 else KARSIT, fill_opacity=1, stroke_width=0)
    ad_ = yazi(ad, boyut=26, renk_=METIN, kalin=True)
    orn = yazi(ornek, boyut=21, renk_=METIN_IKINCIL)
    metin = VGroup(ad_, orn).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
    nokta.next_to(ad_, LEFT, buff=0.25)
    return VGroup(nokta, metin)


class IcIceKumeler(DersSahnesi):
    def construct(self):
        self.kunye(1, "M1.1")

        halkalar, etiketler, satirlar = [], [], []
        satir_y = [2.3, 1.05, -0.2, -1.45]
        for i in range(4):
            c = halka(i)
            e = halka_etiketi(i, c)
            s = ornek_satiri(i)
            s.move_to([1.2, satir_y[i], 0], aligned_edge=LEFT)
            # Bağlantı: halka etiketinden örnek satırına ince çizgi
            if i == 0:
                self.play(Create(c), run_time=1.3, rate_func=smooth)
            else:
                self.play(FadeIn(c, scale=0.6), run_time=1.0)
            self.play(Write(e), FadeIn(s, shift=LEFT * 0.3), run_time=1.0)
            self.wait(2.2)
            halkalar.append(c)
            etiketler.append(e)
            satirlar.append(s)

        # "Her halka bir öncekinin içinde" — dıştan içe kısa vurgu
        self.play(LaggedStart(*[Indicate(etiketler[i], color=KIRMIZI, scale_factor=1.12)
                                for i in range(3)], lag_ratio=0.35), run_time=1.6)
        self.wait(0.6)

        # Yakınlaşma: örnek satırları çekilir, en içteki halka sağda büyür ve dilimlere ayrılır
        self.play(FadeOut(VGroup(*satirlar), shift=RIGHT * 0.3), run_time=0.8)
        self.play(*[h.animate.set_opacity(0.35) for h in halkalar[:3]],
                  *[e.animate.set_opacity(0.35) for e in etiketler[:3]], run_time=0.8)

        R = 2.15
        merkez = [3.55, 0.15, 0]
        dilimler = VGroup(
            Sector(radius=R, angle=2 * PI / 3, start_angle=PI / 2 - PI / 3,
                   fill_color=KIRMIZI, fill_opacity=1, stroke_color=ZEMIN, stroke_width=6),
            Sector(radius=R, angle=2 * PI / 3, start_angle=PI / 2 + PI / 3,
                   fill_color=NOTR_KART, fill_opacity=1, stroke_color=ZEMIN, stroke_width=6),
            Sector(radius=R, angle=2 * PI / 3, start_angle=PI / 2 + PI,
                   fill_color=CIZGI, fill_opacity=1, stroke_color=ZEMIN, stroke_width=6),
        )
        for d in dilimler:
            d.shift(merkez)
        tam = Circle(radius=R, fill_color=KIRMIZI, fill_opacity=1, stroke_width=0).move_to(merkez)

        # Kılavuz çizgiler: küçük halkadan büyük daireye "büyüteç" hissi
        ic = halkalar[3]
        k1 = DashedLine(ic.get_top(), tam.get_top(), color=PASIF, stroke_width=2, dash_length=0.12)
        k2 = DashedLine(ic.get_bottom(), tam.get_bottom(), color=PASIF, stroke_width=2, dash_length=0.12)
        self.play(TransformFromCopy(ic, tam), Create(k1), Create(k2), run_time=1.4)
        self.remove(tam)
        self.add(dilimler)
        self.play(FadeOut(k1), FadeOut(k2), run_time=0.5)

        def etiket(metin, aci, renk_, kalin=False):
            from numpy import array, cos, sin
            yon = array([cos(aci), sin(aci), 0])
            return yazi(metin, boyut=26, renk_=renk_, kalin=kalin).move_to(array(merkez) + yon * R * 0.55)

        e_metin = etiket("Metin", PI / 2, KART, kalin=True)
        e_gorsel = etiket("Görüntü", PI / 2 + 2 * PI / 3, METIN)
        e_ses = etiket("Ses", PI / 2 + 4 * PI / 3, METIN)
        self.play(FadeIn(e_metin), FadeIn(e_gorsel), FadeIn(e_ses), run_time=0.9)
        self.wait(0.8)

        # Metin dilimi öne çıkar
        self.play(dilimler[0].animate.shift([0, 0.22, 0]), e_metin.animate.shift([0, 0.22, 0]),
                  dilimler[1].animate.set_opacity(0.55), dilimler[2].animate.set_opacity(0.55),
                  e_gorsel.animate.set_opacity(0.55), e_ses.animate.set_opacity(0.55), run_time=0.9)

        # Son kare
        son = yazi("Bu ders: metin üreten modeller", boyut=30, renk_=KIRMIZI_KOYU, kalin=True)
        son.next_to(dilimler, DOWN, buff=0.45)
        self.play(FadeIn(son, shift=UP * 0.2), run_time=1.0)
        self.wait(4)
