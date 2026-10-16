"""M3.4 — Kısıtlı çözümleme (constrained decoding) (~35 sn).

H2'deki aday çubukları (M2.4 ile aynı görsel dil). Model JSON'u yazarken "duygu" alanına geldi; sıradaki token için
adaylar. Şema yalnızca "olumlu" / "olumsuz" / "karışık"a izin verir: öteki adayların olasılığı sıfırlanır, kalanlar
yeniden ölçeklenir (toplam %100). Sonra "puan" alanı: Literal[1..5]. Olasılıklar şematik.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h03/m3_4_kisitli.py Kisitli h03-m3.4-kisitli
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, Line, ValueTracker, always_redraw, FadeIn, FadeOut, LaggedStart, ReplacementTransform,
    Transform, UP, DOWN, LEFT, RIGHT, smooth, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

DUYGU = [("nötr", 0.34, False), ("karışık", 0.26, True), ("olumlu", 0.18, True), ("olumsuz", 0.09, True),
         ("Karışık", 0.07, False), ("belki", 0.04, False), ("\\n", 0.02, False)]
PUAN = [("3", 0.52, True), ("üç", 0.18, False), ("3.5", 0.12, False), ("4", 0.09, True), ('"3"', 0.06, False),
        ("2", 0.03, True)]


def oranlar(adaylar, t):
    """t=0: modelin olasılıkları; t=1: şema maskesi uygulanmış ve yeniden ölçeklenmiş."""
    gecerli_top = sum(p for _, p, g in adaylar if g)
    out = []
    for _, p, g in adaylar:
        son = p / gecerli_top if g else 0.0
        out.append(p + (son - p) * t)
    return out


def yuzde(p):
    if p < 0.005:
        return "%0"
    return f"%{p * 100:.0f}"


def grafik(adaylar, t, x0, y0, satir=0.56, olcek=6.0, etiket_boyut=24, yuzde_boyut=21):
    ps = oranlar(adaylar, t)
    enb = max(range(len(ps)), key=lambda i: ps[i])
    g = VGroup()
    for i, ((ad, _, gecerli), p) in enumerate(zip(adaylar, ps)):
        y = y0 - i * satir
        renk_et = METIN if (gecerli or t < 0.5) else PASIF
        et = kod(ad, boyut=etiket_boyut, renk_=renk_et).move_to([x0, y, 0], aligned_edge=RIGHT)
        if i == enb:
            dolgu = KIRMIZI
        elif not gecerli and t > 0:
            dolgu = interpolate_color(interpolate_color(KARSIT, KART, 0.45), PASIF, t)
        else:
            dolgu = interpolate_color(KARSIT, KART, 0.45)
        w = max(p * olcek, 0.02)
        cubuk = Rectangle(width=w, height=satir * 0.62, stroke_width=0, fill_color=dolgu, fill_opacity=1) \
            .move_to([x0 + 0.25, y, 0], aligned_edge=LEFT)
        yz = yazi(yuzde(p), boyut=yuzde_boyut, renk_=METIN_IKINCIL).next_to(cubuk, RIGHT, buff=0.15)
        parca = VGroup(et, cubuk, yz)
        if not gecerli and t > 0.5:
            cizik = Line(et.get_left() + LEFT * 0.05, et.get_right() + RIGHT * 0.05, stroke_color=KIRMIZI, stroke_width=3)
            parca.add(cizik)
        g.add(parca)
    return g


class Kisitli(DersSahnesi):
    def construct(self):
        self.kunye(3, "M3.4")
        t = ValueTracker(0.0)

        yazilan = kod('{"gerekce": "Ürün iyi, aksesuar bozuk", "duygu": "', boyut=24, renk_=METIN)
        imlec = Rectangle(width=0.16, height=0.42, stroke_width=0, fill_color=KIRMIZI, fill_opacity=1)
        satir = VGroup(yazilan, imlec).arrange(RIGHT, buff=0.06).move_to([0, 3.15, 0])
        aciklama = yazi("Model JSON'u yazıyor. Sıradaki token için adaylar:", boyut=21, renk_=METIN_IKINCIL).next_to(satir, DOWN, buff=0.18)
        self.play(FadeIn(satir), FadeIn(aciklama), run_time=0.8)

        cizim = always_redraw(lambda: grafik(DUYGU, t.get_value(), -2.2, 1.65))
        self.play(FadeIn(cizim), run_time=0.8)
        n = yazi("Şemasız: en olası aday “nötr”. Şemada böyle bir değer yok.", boyut=23, renk_=METIN).move_to([0, -2.6, 0])
        self.play(FadeIn(n), run_time=0.4)
        self.wait(3.2)

        # Şema maskesi
        sema = kart(3.6, 1.6, dolgu=KIRMIZI_ACIK, kenar=KIRMIZI, kalinlik=2.5).move_to([4.6, 0.9, 0])
        sema_t = VGroup(yazi("Şema", boyut=20, renk_=KIRMIZI_KOYU, kalin=True),
                        kod('duygu: "olumlu"', boyut=18, renk_=METIN),
                        kod('| "olumsuz"', boyut=18, renk_=METIN),
                        kod('| "karışık"', boyut=18, renk_=METIN)).arrange(DOWN, buff=0.06, aligned_edge=LEFT)
        girinti = kod("duygu: ", boyut=18).width - kod("| ", boyut=18).width
        sema_t[2].shift(RIGHT * girinti)
        sema_t[3].shift(RIGHT * girinti)
        sema_t.move_to(sema)
        n2 = yazi("Şemaya uymayan adayların olasılığı sıfırlanır; kalanlar yeniden ölçeklenir.", boyut=23, renk_=METIN).move_to(n)
        self.play(FadeIn(sema), FadeIn(sema_t), ReplacementTransform(n, n2), run_time=0.8)
        self.play(t.animate.set_value(1.0), run_time=3.0, rate_func=smooth)
        self.wait(2.5)

        secim = kod('karışık"', boyut=24, renk_=KIRMIZI).next_to(yazilan, RIGHT, buff=0.06)
        secim.align_to(yazilan, DOWN)
        yeni_satir = VGroup(yazilan, secim, imlec)
        n3 = yazi("Seçim yalnızca geçerli adaylar arasından: “karışık”.", boyut=23, renk_=KIRMIZI_KOYU, kalin=True).move_to(n)
        self.play(FadeIn(secim, shift=UP * 0.1), imlec.animate.next_to(secim, RIGHT, buff=0.06),
                  ReplacementTransform(n2, n3), run_time=0.8)
        self.wait(2.2)

        # Puan alanı
        self.play(FadeOut(cizim), FadeOut(sema), FadeOut(sema_t), FadeOut(n3), FadeOut(aciklama), run_time=0.5)
        self.remove(cizim)
        t2 = ValueTracker(0.0)
        satir3 = VGroup(kod('… "duygu": "karışık", "puan": ', boyut=24, renk_=METIN),
                        Rectangle(width=0.16, height=0.42, stroke_width=0, fill_color=KIRMIZI, fill_opacity=1)) \
            .arrange(RIGHT, buff=0.06).move_to([0, 3.15, 0])
        self.play(FadeOut(yeni_satir), FadeIn(satir3), run_time=0.6)
        cizim2 = always_redraw(lambda: grafik(PUAN, t2.get_value(), -2.2, 1.9))
        sema2 = kart(4.2, 0.95, dolgu=KIRMIZI_ACIK, kenar=KIRMIZI, kalinlik=2.5).move_to([4.6, 0.9, 0])
        sema2_t = VGroup(yazi("Şema", boyut=20, renk_=KIRMIZI_KOYU, kalin=True),
                         kod("puan: 1 | 2 | 3 | 4 | 5", boyut=17, renk_=METIN)).arrange(DOWN, buff=0.06, aligned_edge=LEFT).move_to(sema2)
        self.play(FadeIn(cizim2), FadeIn(sema2), FadeIn(sema2_t), run_time=0.7)
        self.wait(1.4)
        n4 = yazi("“üç”, “3.5” ve tırnaklı “3” elenir: puan her zaman 1–5 arası bir sayı.", boyut=23, renk_=METIN).move_to([0, -2.6, 0])
        self.play(t2.animate.set_value(1.0), FadeIn(n4), run_time=2.4, rate_func=smooth)
        self.wait(2.0)

        ozet = VGroup(yazi("Şema bir rica değil: geçersiz token seçilemez.", boyut=26, renk_=METIN, kalin=True),
                      yazi("Biçim garanti; doğruluk değil. “karışık” geçerli ama yanlış da olabilir.", boyut=21, renk_=METIN_IKINCIL)) \
            .arrange(DOWN, buff=0.12).move_to([0, -2.85, 0])
        self.play(ReplacementTransform(n4, ozet), run_time=0.8)
        self.wait(8.0)
