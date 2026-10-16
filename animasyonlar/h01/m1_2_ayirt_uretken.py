"""M1.2 — Aynı girdi, iki model: ayırt edici etiket verir, üretken model yeni metin yazar (~30 sn).

Render (proje kökünden):
  manim -qh animasyonlar/h01/m1_2_ayirt_uretken.py AyirtUretken
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Arrow, Create, FadeIn, FadeOut, GrowArrow, Indicate, TransformFromCopy,
    AddTextLetterByLetter, Circumscribe, UP, DOWN, LEFT, RIGHT, linear,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kart, KIRMIZI, KIRMIZI_KOYU, METIN, NOTR_KART, METIN_IKINCIL,
    CIZGI, KARSIT, PASIF, KART, ZEMIN,
)

SOL_X, SAG_X = -3.55, 3.55


def eposta_karti():
    k = kart(6.6, 1.25)
    etiket = yazi("E-POSTA", boyut=16, renk_=METIN_IKINCIL, kalin=True)
    metin = yazi("“Toplantıyı yarına alabilir miyiz?”", boyut=28, renk_=METIN)
    icerik = VGroup(etiket, metin).arrange(DOWN, aligned_edge=LEFT, buff=0.14)
    icerik.move_to(k)
    return VGroup(k, icerik)


def model_kutusu(ad, alt, vurgu):
    k = kart(5.4, 1.05, dolgu=NOTR_KART if vurgu == KARSIT else KART, kenar=vurgu, kalinlik=3)
    a = yazi(ad, boyut=26, renk_=vurgu, kalin=True)
    b = yazi(alt, boyut=18, renk_=METIN_IKINCIL)
    VGroup(a, b).arrange(DOWN, buff=0.08).move_to(k)
    return VGroup(k, a, b)


def hap(metin, dolgu, yazi_renk, kenar=None):
    t = yazi(metin, boyut=24, renk_=yazi_renk, kalin=True)
    k = kart(t.width + 0.6, 0.62, dolgu=dolgu, kenar=kenar or dolgu, kalinlik=2, yaricap=0.31)
    t.move_to(k)
    return VGroup(k, t)


class AyirtUretken(DersSahnesi):
    def construct(self):
        self.kunye(1, "M1.2")

        # 1) Girdi
        eposta = eposta_karti().move_to(UP * 2.75)
        self.play(FadeIn(eposta, shift=DOWN * 0.2), run_time=1.0)
        self.wait(1.5)

        # 2) İki model
        sol = model_kutusu("Sınıflandırıcı", "ayırt edici model", KARSIT).move_to([SOL_X, 0.85, 0])
        sag = model_kutusu("Üretken model", "ör. ChatGPT", KIRMIZI).move_to([SAG_X, 0.85, 0])
        ok_sol = Arrow(eposta.get_bottom() + LEFT * 1.6, sol.get_top(), buff=0.12, color=PASIF, stroke_width=4)
        ok_sag = Arrow(eposta.get_bottom() + RIGHT * 1.6, sag.get_top(), buff=0.12, color=PASIF, stroke_width=4)
        self.play(GrowArrow(ok_sol), GrowArrow(ok_sag), run_time=0.8)
        self.play(FadeIn(sol, shift=UP * 0.15), FadeIn(sag, shift=UP * 0.15), run_time=0.9)
        self.wait(1.2)

        # 3) Sol: seçenekler önceden belli → birini seçer
        secenek_baslik = yazi("Seçenekler önceden belli", boyut=18, renk_=METIN_IKINCIL)
        spam = hap("spam", KART, METIN_IKINCIL, kenar=CIZGI)
        degil = hap("spam değil", KART, METIN_IKINCIL, kenar=CIZGI)
        haplar = VGroup(spam, degil).arrange(RIGHT, buff=0.35)
        sol_cikti = VGroup(secenek_baslik, haplar).arrange(DOWN, buff=0.22)
        sol_cikti.next_to(sol, DOWN, buff=0.55)
        ok_sol2 = Arrow(sol.get_bottom(), sol_cikti.get_top(), buff=0.08, color=PASIF, stroke_width=4)
        self.play(GrowArrow(ok_sol2), FadeIn(sol_cikti), run_time=0.9)
        self.wait(0.6)
        secili = hap("spam değil  ✓", KARSIT, KART).move_to(degil)
        self.play(spam.animate.set_opacity(0.35), FadeOut(degil), FadeIn(secili, scale=1.1), run_time=0.8)
        self.play(Circumscribe(secili, color=KARSIT, buff=0.08), run_time=1.0)
        sol_not = yazi("Çıktı: hazır bir etiket", boyut=20, renk_=KARSIT, kalin=True)
        sol_not.next_to(haplar, DOWN, buff=0.4)
        self.play(FadeIn(sol_not, shift=UP * 0.1), run_time=0.6)
        self.wait(2.0)

        # 4) Sağ: yeni metin yazar — kelime kelime
        cevap_kart = kart(5.4, 1.05).next_to(sag, DOWN, buff=0.55)
        ok_sag2 = Arrow(sag.get_bottom(), cevap_kart.get_top(), buff=0.08, color=PASIF, stroke_width=4)
        cevap1 = yazi("Tabii, yarın 14.00 size uyar mı?", boyut=22, renk_=METIN).move_to(cevap_kart)
        self.play(GrowArrow(ok_sag2), FadeIn(cevap_kart), run_time=0.8)
        self.play(AddTextLetterByLetter(cevap1, time_per_char=0.06, rate_func=linear))
        self.wait(1.8)

        # Aynı soruya ikinci deneme: başka bir cevap
        deneme = yazi("aynı soru, 2. deneme", boyut=17, renk_=METIN_IKINCIL)
        cevap_kart2 = kart(5.4, 1.05).next_to(cevap_kart, DOWN, buff=0.45)
        deneme.next_to(cevap_kart2, UP, buff=0.06).align_to(cevap_kart2, LEFT)
        cevap2 = yazi("Olur, yarın sabah 10'da görüşelim.", boyut=22, renk_=METIN).move_to(cevap_kart2)
        self.play(FadeIn(cevap_kart2), FadeIn(deneme), run_time=0.6)
        self.play(AddTextLetterByLetter(cevap2, time_per_char=0.05, rate_func=linear))
        sag_not = yazi("Çıktı: yeni metin, her seferinde farklı", boyut=20, renk_=KIRMIZI, kalin=True)
        sag_not.next_to(cevap_kart2, DOWN, buff=0.3)
        self.play(FadeIn(sag_not, shift=UP * 0.1), run_time=0.6)
        self.wait(2.2)

        # 5) Son kare
        self.play(Indicate(eposta, color=KIRMIZI, scale_factor=1.04), run_time=1.2)
        son = yazi("Girdi aynı; çıktının türü farklı.", boyut=28, renk_=KIRMIZI_KOYU, kalin=True)
        son.move_to([SOL_X, -2.85, 0])
        self.play(FadeIn(son, shift=UP * 0.2), run_time=0.9)
        self.wait(4)
