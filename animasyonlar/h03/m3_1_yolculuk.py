"""M3.1 — Bir API isteğinin yolculuğu (~45 sn).

Python kodu → OpenRouter → sağlayıcı seçimi → model → cevap token token geri akar (streaming).
İkinci tur: API hafızasızdır; system + user 1 + assistant 1 + user 2 birlikte yeniden gider, girdi token'ı büyür.
Token sayıları örnek (slayt "Her turda girdi büyür" ile aynı: ≈150, ≈330, ≈520).

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h03/m3_1_yolculuk.py Yolculuk h03-m3.1-yolculuk
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, Line, Arrow, FadeIn, FadeOut, LaggedStart, ReplacementTransform, Transform,
    UP, DOWN, LEFT, RIGHT, interpolate_color, smooth, MoveAlongPath,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

RENK = {
    "system": PASIF,
    "user": KARSIT,
    "assistant": KIRMIZI,
}
BAR_W, BAR_H = 2.7, 0.36
PY_X = -4.9
OR_X = -0.9
SAG_X = 3.9
SAG_Y = [1.55, 0.25, -1.05]


def mesaj_bar(rol, ad, w=BAR_W, h=BAR_H):
    r = Rectangle(width=w, height=h, stroke_width=0, fill_color=RENK[rol], fill_opacity=1)
    t = yazi(ad, boyut=19, renk_=KART if rol != "system" else METIN, kalin=True).move_to(r)
    return VGroup(r, t)


def paket(barlar):
    """Mesaj çubuklarının küçük kopyası: istekle birlikte yolculuk eder."""
    g = VGroup(*[Rectangle(width=0.9, height=0.13, stroke_width=0, fill_color=b[0].get_fill_color(), fill_opacity=1)
                 for b in barlar]).arrange(DOWN, buff=0.04)
    zarf = kart(1.15, g.height + 0.2, dolgu=KART, kenar=METIN, kalinlik=2, yaricap=0.06).move_to(g)
    return VGroup(zarf, g)


class Yolculuk(DersSahnesi):
    def construct(self):
        self.kunye(3, "M3.1")

        # 1) Sahne: Python, OpenRouter, sağlayıcılar
        py = kart(3.5, 4.6).move_to([PY_X, 0.0, 0])
        py_b = yazi("Python kodunuz", boyut=24, renk_=METIN, kalin=True).next_to(py.get_top(), DOWN, buff=0.22)
        py_k = kod("messages = [", boyut=19, renk_=METIN_IKINCIL).next_to(py_b, DOWN, buff=0.22).align_to(py, LEFT).shift(RIGHT * 0.35)

        orr = kart(2.6, 1.4, dolgu=KARSIT, kenar=KARSIT).move_to([OR_X, 0.25, 0])
        or_t = VGroup(yazi("OpenRouter", boyut=26, renk_=KART, kalin=True),
                      yazi("tek anahtar, tek adres", boyut=16, renk_=interpolate_color(KART, KARSIT, 0.3))).arrange(DOWN, buff=0.1).move_to(orr)

        saglayicilar = VGroup()
        etiketler = ["Sağlayıcı A", "Sağlayıcı B", "Sağlayıcı C"]
        durumlar = ["yoğun", "uygun", "yavaş"]
        for ad, y in zip(etiketler, SAG_Y):
            c = kart(3.1, 1.0).move_to([SAG_X, y, 0])
            t = VGroup(yazi(ad, boyut=21, renk_=METIN, kalin=True), yazi("aynı model çalışıyor", boyut=15, renk_=METIN_IKINCIL)).arrange(DOWN, buff=0.06).move_to(c)
            saglayicilar.add(VGroup(c, t))
        cizgiler = VGroup(*[Line(orr.get_right(), s[0].get_left(), stroke_color=CIZGI, stroke_width=3) for s in saglayicilar])
        ok1 = Arrow(py.get_right() + UP * 0.25, orr.get_left(), buff=0.12, stroke_color=METIN, stroke_width=4, max_tip_length_to_length_ratio=0.12)

        self.play(FadeIn(py), FadeIn(py_b), FadeIn(py_k), run_time=0.7)
        self.play(FadeIn(orr), FadeIn(or_t), FadeIn(ok1), run_time=0.6)
        self.play(LaggedStart(*[FadeIn(s) for s in saglayicilar], lag_ratio=0.2), FadeIn(cizgiler), run_time=0.9)
        self.wait(1.5)

        # Sayaç
        sayac = yazi("Girdi: 0 token", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to([OR_X, 3.15, 0])
        self.add(sayac)

        # 2) Tur 1: system + user 1
        y0 = py_k.get_bottom()[1] - 0.35
        barlar = []

        def bar_ekle(rol, ad):
            b = mesaj_bar(rol, ad).move_to([PY_X, y0 - len(barlar) * (BAR_H + 0.12), 0])
            barlar.append(b)
            return b

        b_sys = bar_ekle("system", "system")
        b_u1 = bar_ekle("user", "user 1")
        self.play(FadeIn(b_sys, shift=RIGHT * 0.2), run_time=0.45)
        self.play(FadeIn(b_u1, shift=RIGHT * 0.2), run_time=0.45)
        self.wait(0.4)

        def gonder(sayi, secilen=1, not_metni=None):
            pk = paket(barlar).move_to(py.get_right() + LEFT * 0.75 + UP * 0.25)
            self.play(FadeIn(pk, scale=0.8), run_time=0.35)
            self.play(pk.animate.move_to(orr.get_center()), run_time=0.9, rate_func=smooth)
            yeni_sayac = yazi(f"Girdi: {sayi} token", boyut=26, renk_=KIRMIZI, kalin=True).move_to(sayac)
            self.play(Transform(sayac, yeni_sayac), run_time=0.4)
            # sağlayıcı seçimi
            durum_yazi = VGroup()
            for i, s in enumerate(saglayicilar):
                renk_ = KIRMIZI if i == secilen else PASIF
                durum_yazi.add(yazi(durumlar[i], boyut=15, renk_=renk_, kalin=i == secilen).next_to(s[0], UP, buff=0.04).align_to(s[0], RIGHT))
            self.play(FadeIn(durum_yazi), cizgiler[secilen].animate.set_stroke(KIRMIZI, width=5),
                      saglayicilar[secilen][0].animate.set_stroke(KIRMIZI, width=4), run_time=0.6)
            self.play(pk.animate.move_to(saglayicilar[secilen][0].get_center()).scale(0.6).set_opacity(0), run_time=0.7)
            self.remove(pk)
            return durum_yazi

        n1 = yazi("OpenRouter, modeli o an uygun bir sağlayıcıya gönderir.", boyut=22, renk_=METIN).move_to([0.6, -3.05, 0])
        self.play(FadeIn(n1), run_time=0.4)
        durum1 = gonder(150)
        self.wait(2.0)

        # 3) Cevap token token geri akar
        n2 = yazi("Cevap token token geri akar (streaming).", boyut=22, renk_=METIN).move_to(n1)
        self.play(ReplacementTransform(n1, n2), run_time=0.4)
        b_a1 = mesaj_bar("assistant", "assistant 1").move_to([PY_X, y0 - len(barlar) * (BAR_H + 0.12), 0])
        parcalar = ["Karışık", ".", " Puan", ":", " 3"]
        cipler = VGroup()
        kaynak = saglayicilar[1][0].get_left()
        for i, p in enumerate(parcalar):
            c = VGroup(Rectangle(width=0.62, height=0.3, stroke_width=0, fill_color=KIRMIZI, fill_opacity=1),
                       yazi(p.strip() or "·", boyut=14, renk_=KART, kalin=True))
            c[1].move_to(c[0])
            c.move_to(kaynak)
            hedef = b_a1.get_left() + RIGHT * (0.36 + i * 0.5)
            self.play(c.animate.move_to(hedef), run_time=0.5, rate_func=smooth)
            cipler.add(c)
        self.play(ReplacementTransform(cipler, b_a1), run_time=0.5)
        barlar.append(b_a1)
        self.wait(2.0)

        # 4) Tur 2: hafızasız
        self.play(FadeOut(durum1), cizgiler[1].animate.set_stroke(CIZGI, width=3),
                  saglayicilar[1][0].animate.set_stroke(CIZGI, width=2), run_time=0.4)
        b_u2 = bar_ekle("user", "user 2")
        n3 = yazi("İkinci soru. Model ilk turu hatırlamaz…", boyut=22, renk_=METIN).move_to(n2)
        self.play(FadeIn(b_u2, shift=RIGHT * 0.2), ReplacementTransform(n2, n3), run_time=0.6)
        self.wait(1.8)
        n4 = yazi("…bu yüzden geçmişin tamamı yeniden gönderilir.", boyut=22, renk_=KIRMIZI_KOYU, kalin=True).move_to(n3)
        vurgu = Rectangle(width=BAR_W + 0.3, height=4 * (BAR_H + 0.12) + 0.1, stroke_color=KIRMIZI, stroke_width=4) \
            .move_to(VGroup(*barlar))
        self.play(ReplacementTransform(n3, n4), FadeIn(vurgu), run_time=0.6)
        self.wait(1.5)
        durum2 = gonder(330, secilen=1)
        self.wait(3.0)

        # 5) Son kare: turlar ve girdi
        self.play(FadeOut(VGroup(py, py_b, py_k, *barlar, vurgu, orr, or_t, ok1, saglayicilar, cizgiler, durum2, n4, sayac)), run_time=0.7)
        baslik = yazi("Her istekte gönderilen girdi (örnek)", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to([0, 2.8, 0])
        turlar = [("Tur 1", ["system", "user"], 150), ("Tur 2", ["system", "user", "assistant", "user"], 330),
                  ("Tur 3", ["system", "user", "assistant", "user", "assistant", "user"], 520)]
        satirlar = VGroup()
        for ad, roller, sayi in turlar:
            parcalar_ = VGroup(*[Rectangle(width=1.05 if r != "system" else 0.8, height=0.5, stroke_width=0,
                                           fill_color=RENK[r], fill_opacity=1) for r in roller]).arrange(RIGHT, buff=0.06)
            yy = 1.55 - len(satirlar) * 0.85
            et = yazi(ad, boyut=24, renk_=METIN, kalin=True).move_to([-4.2, yy, 0], aligned_edge=LEFT)
            parcalar_.move_to([-3.0, yy, 0], aligned_edge=LEFT)
            sy = yazi(f"≈ {sayi} token", boyut=24, renk_=KIRMIZI, kalin=True).next_to(parcalar_, RIGHT, buff=0.35)
            satirlar.add(VGroup(et, parcalar_, sy))
        lejant = VGroup(*[VGroup(Rectangle(width=0.3, height=0.3, stroke_width=0, fill_color=RENK[r], fill_opacity=1),
                                 yazi(r, boyut=19, renk_=METIN)).arrange(RIGHT, buff=0.12) for r in ["system", "user", "assistant"]]) \
            .arrange(RIGHT, buff=0.6).move_to([0, -1.35, 0])
        self.play(FadeIn(baslik), LaggedStart(*[FadeIn(s, shift=UP * 0.12) for s in satirlar], lag_ratio=0.35), FadeIn(lejant), run_time=1.6)
        ozet = VGroup(yazi("API hafızasızdır: model önceki istekleri hatırlamaz.", boyut=26, renk_=METIN),
                      yazi("“Hatırlama”, geçmişi her istekte sizin yeniden göndermenizdir.", boyut=26, renk_=METIN)) \
            .arrange(DOWN, buff=0.14).move_to([0, -2.55, 0])
        self.play(FadeIn(ozet, shift=UP * 0.1), run_time=0.8)
        self.wait(8.0)
