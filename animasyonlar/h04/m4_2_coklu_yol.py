"""M4.2 — Self-Consistency ve Tree of Thoughts (~45 sn).

Self-Consistency (Wang vd. 2022, arXiv 2203.11171): aynı soru birkaç kez (sıcaklık > 0) çözülür, en sık cevap seçilir.
Örnek soru makaledeki klasik örneğin Türkçesi: 23 elma, 20'si kullanıldı, 6 alındı → 9. Yolların ara adımları şematik.
Tree of Thoughts (Yao vd. 2023, arXiv 2305.10601): düşünce adımları ağaç gibi dallanır, her dal değerlendirilir, zayıflar budanır.
Bedeli: n kat istek / token. Akıl yürüten modeller benzerini içeride yapar.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h04/m4_2_coklu_yol.py CokluYol h04-m4.2-coklu-yol
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Line, Arrow, Circle, FadeIn, FadeOut, LaggedStart, Create, ReplacementTransform, Transform,
    UP, DOWN, LEFT, RIGHT, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

YOLLAR = [
    ("23 − 20 = 3, 3 + 6 = 9", "9"),
    ("20 kullanıldı → 3 kaldı → +6", "9"),
    ("23 − 20 = 3 elma", "3"),
    ("3 elma kaldı, 6 geldi", "9"),
    ("23 + 6 = 29", "29"),
]


class CokluYol(DersSahnesi):
    def construct(self):
        self.kunye(4, "M4.2")
        bas = yazi("Self-Consistency: aynı soruyu birkaç kez çöz, oyla", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to([0, 3.35, 0])
        soru = kart(4.3, 1.5).move_to([-4.6, 0.6, 0])
        s_yazi = VGroup(yazi("Kafede 23 elma vardı.", boyut=19), yazi("20'sini kullandılar,", boyut=19),
                        yazi("6 tane aldılar.", boyut=19), yazi("Kaç elma var?", boyut=19, kalin=True)) \
            .arrange(DOWN, buff=0.05, aligned_edge=LEFT).move_to(soru)
        self.play(FadeIn(bas), FadeIn(soru), FadeIn(s_yazi), run_time=0.8)
        self.wait(1.0)

        satirlar = VGroup()
        oklar = VGroup()
        for i, (yol, cevap) in enumerate(YOLLAR):
            y = 2.2 - i * 0.82
            kutu = kart(4.4, 0.6, dolgu=KART, kenar=CIZGI, yaricap=0.1).move_to([0.6, y, 0])
            t = yazi(yol, boyut=18, renk_=METIN).move_to(kutu)
            dogru = cevap == "9"
            c = yazi(cevap, boyut=26, renk_=KIRMIZI if dogru else METIN_IKINCIL, kalin=True).move_to([3.6, y, 0])
            ok = Arrow(soru.get_right(), kutu.get_left(), buff=0.1, stroke_width=2.5, stroke_color=PASIF, max_tip_length_to_length_ratio=0.08)
            satirlar.add(VGroup(kutu, t, c))
            oklar.add(ok)
        alt = yazi("sıcaklık > 0: her seferinde farklı bir yol", boyut=18, renk_=METIN_IKINCIL).next_to(soru, DOWN, buff=0.3)
        self.play(FadeIn(alt), LaggedStart(*[FadeIn(VGroup(o, s[0], s[1])) for o, s in zip(oklar, satirlar)], lag_ratio=0.3), run_time=2.2)
        self.play(LaggedStart(*[FadeIn(s[2], scale=1.3) for s in satirlar], lag_ratio=0.2), run_time=1.2)
        self.wait(1.2)

        oy = kart(2.2, 1.7, dolgu=KIRMIZI_ACIK, kenar=KIRMIZI, kalinlik=2.5).move_to([5.6, 0.6, 0])
        oy_t = VGroup(yazi("Oylama", boyut=20, renk_=KIRMIZI_KOYU, kalin=True), yazi("9 → 3 oy", boyut=20, renk_=METIN),
                      yazi("3 → 1 · 29 → 1", boyut=16, renk_=METIN_IKINCIL)).arrange(DOWN, buff=0.1).move_to(oy)
        self.play(FadeIn(oy), FadeIn(oy_t), run_time=0.7)
        sonuc = yazi("Cevap: 9", boyut=30, renk_=KIRMIZI, kalin=True).next_to(oy, DOWN, buff=0.3)
        self.play(FadeIn(sonuc, shift=UP * 0.1), run_time=0.5)
        self.wait(3.0)

        # Tree of Thoughts
        self.play(FadeOut(VGroup(soru, s_yazi, satirlar, oklar, alt, oy, oy_t, sonuc)), run_time=0.6)
        bas2 = yazi("Tree of Thoughts: dallan, değerlendir, buda", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to(bas)
        self.play(ReplacementTransform(bas, bas2), run_time=0.5)

        def dugum(x, y, metin, renk_=KART, kenar=CIZGI):
            c = kart(2.3, 0.62, dolgu=renk_, kenar=kenar, yaricap=0.12).move_to([x, y, 0])
            return VGroup(c, yazi(metin, boyut=17, renk_=METIN).move_to(c))

        kok = dugum(0, 2.3, "Problem", NOTR_KART)
        self.play(FadeIn(kok), run_time=0.4)
        d1 = [dugum(x, 0.9, f"Fikir {i + 1}") for i, x in enumerate([-3.6, 0, 3.6])]
        c1 = [Line(kok.get_bottom(), d.get_top(), stroke_color=PASIF, stroke_width=2.5) for d in d1]
        self.play(*[Create(c) for c in c1], *[FadeIn(d) for d in d1], run_time=0.8)
        puanlar = ["%20", "%70", "%35"]
        p1 = [yazi(p, boyut=18, renk_=KIRMIZI if p == "%70" else METIN_IKINCIL, kalin=p == "%70").next_to(d, RIGHT, buff=0.12) for p, d in zip(puanlar, d1)]
        n = yazi("Her dal değerlendirilir…", boyut=21, renk_=METIN).move_to([0, -2.8, 0])
        self.play(*[FadeIn(p) for p in p1], FadeIn(n), run_time=0.6)
        self.wait(1.4)
        n2 = yazi("…zayıf dallar budanır, en iyisi açılır.", boyut=21, renk_=METIN).move_to(n)
        self.play(VGroup(d1[0], c1[0], p1[0], d1[2], c1[2], p1[2]).animate.set_opacity(0.2), ReplacementTransform(n, n2), run_time=0.7)
        d2 = [dugum(x, -0.6, m) for x, m in [(-1.6, "Adım 2a"), (1.6, "Adım 2b")]]
        c2 = [Line(d1[1].get_bottom(), d.get_top(), stroke_color=PASIF, stroke_width=2.5) for d in d2]
        self.play(*[Create(c) for c in c2], *[FadeIn(d) for d in d2], run_time=0.7)
        self.play(VGroup(d2[0], c2[0]).animate.set_opacity(0.2), run_time=0.5)
        cozum = dugum(1.6, -1.95, "Çözüm", KIRMIZI_ACIK, KIRMIZI)
        c3 = Line(d2[1].get_bottom(), cozum.get_top(), stroke_color=KIRMIZI, stroke_width=3)
        self.play(Create(c3), FadeIn(cozum), run_time=0.6)
        self.wait(2.0)

        ozet = VGroup(yazi("Bedeli: n yol = n kat istek ve token.", boyut=22, renk_=METIN, kalin=True),
                      yazi("Akıl yürüten modeller benzerini içeride yapar.", boyut=20, renk_=METIN_IKINCIL)) \
            .arrange(DOWN, buff=0.12).move_to([0, -3.05, 0])
        self.play(ReplacementTransform(n2, ozet), run_time=0.7)
        self.wait(8.0)
