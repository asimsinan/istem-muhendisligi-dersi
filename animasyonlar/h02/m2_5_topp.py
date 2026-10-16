"""M2.5 — Top-k ve top-p (~55 sn). Adaylar M2.4 ve V2.2 ile aynı, sıcaklık 0,8.
Önce top-k = 3: en olası 3 aday kalır. Sonra top-p = 0,9: olasılıklar yukarıdan toplanır, toplam 0,9'a
ulaşınca çizgi çekilir. Sonda karşılaştırma (aynı formülle hesaplanmış): model eminken (T 0,3) top-p 2 aday,
kararsızken (T 1,5) 5 aday bırakır; top-k her zaman 3.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_5_topp.py TopP h02-m2.5-topp
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Line, DashedLine, FadeIn, FadeOut, Create, LaggedStart, Indicate, ReplacementTransform, UP, DOWN, LEFT, RIGHT,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, KIRMIZI, METIN, METIN_IKINCIL, CIZGI, KARSIT, PASIF,
)
from h02.m2_4_sicaklik import ADAYLAR, olasiliklar, grafik  # noqa: E402

T, P = 0.8, 0.9


class TopP(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.5")
        X0, Y0, SATIR = -3.6, 2.2, 0.58
        istem = VGroup(yazi("Isparta'nın en meşhur ürünü", boyut=28, renk_=METIN),
                       yazi("___", boyut=28, renk_=KIRMIZI, kalin=True)).arrange(RIGHT, buff=0.2)
        istem.move_to([-1.6, 3.35, 0])
        ayar = yazi("sıcaklık 0,8", boyut=20, renk_=METIN_IKINCIL).next_to(istem, RIGHT, buff=0.5)
        g = grafik(T, X0, Y0, satir=SATIR, olcek=7.0)
        self.play(FadeIn(istem), FadeIn(ayar), FadeIn(g), run_time=1.0)
        self.wait(1.5)

        # Top-k: sabit sayıda aday
        K = 3
        yk = Y0 - (K - 1) * SATIR - SATIR / 2
        k_cizgi = DashedLine([-6.4, yk, 0], [6.6, yk, 0], color=KARSIT, stroke_width=4, dash_length=0.18)
        k_et = yazi("top-k = 3: en olası 3 aday kalır", boyut=22, renk_=KARSIT, kalin=True).next_to(k_cizgi, DOWN, buff=0.08).align_to(k_cizgi, RIGHT)
        self.play(Create(k_cizgi), FadeIn(k_et), run_time=0.9)
        k_atilan = VGroup(*g[K:])
        self.play(k_atilan.animate.set_opacity(0.25), run_time=0.7)
        self.wait(2.4)
        k_not = yazi("Sayı sabit: model ne kadar emin olursa olsun hep 3 aday.", boyut=22, renk_=METIN).move_to([0, -3.15, 0])
        self.play(FadeIn(k_not), run_time=0.5)
        self.wait(2.2)
        self.play(FadeOut(VGroup(k_cizgi, k_et, k_not)), k_atilan.animate.set_opacity(1), run_time=0.7)
        ayar2 = yazi("sıcaklık 0,8 · top-p = 0,9", boyut=20, renk_=METIN_IKINCIL).move_to(ayar, aligned_edge=LEFT)
        self.play(ReplacementTransform(ayar, ayar2), run_time=0.5)
        ayar = ayar2

        # Yukarıdan toplama
        ps = olasiliklar(T)
        baslik = yazi("toplam", boyut=20, renk_=METIN_IKINCIL, kalin=True).move_to([5.6, Y0 + 0.55, 0])
        self.play(FadeIn(baslik), run_time=0.4)
        toplam, kesim = 0.0, None
        toplamlar = VGroup()
        for i, p in enumerate(ps):
            toplam += p
            t = yazi(f"%{toplam * 100:.0f}", boyut=24, renk_=KIRMIZI if toplam >= P else METIN,
                     kalin=toplam >= P).move_to([5.6, Y0 - i * SATIR, 0])
            toplamlar.add(t)
            self.play(FadeIn(t, shift=LEFT * 0.1), run_time=0.6)
            if toplam >= P:
                kesim = i
                break
            self.wait(0.6)
        self.wait(0.8)

        # Çizgi ve atılanlar
        y_cizgi = Y0 - kesim * SATIR - SATIR / 2
        cizgi = DashedLine([-6.4, y_cizgi, 0], [6.6, y_cizgi, 0], color=KIRMIZI, stroke_width=4, dash_length=0.18)
        etiket = yazi("p = 0,9'a ulaşıldı", boyut=20, renk_=KIRMIZI, kalin=True).next_to(cizgi, DOWN, buff=0.08)
        etiket.align_to(cizgi, RIGHT)
        self.play(Create(cizgi), FadeIn(etiket), run_time=1.0)
        self.wait(1.5)
        atilan = VGroup(*g[kesim + 1:])
        cizikler = VGroup(*[Line(s[0].get_left() + LEFT * 0.1, s[2].get_right() + RIGHT * 0.1,
                                 stroke_color=PASIF, stroke_width=3) for s in atilan])
        self.play(atilan.animate.set_opacity(0.25), Create(cizikler), run_time=1.0)
        at_not = yazi("atıldı: seçilemez", boyut=20, renk_=PASIF).move_to([5.6, Y0 - (kesim + 2.5) * SATIR, 0])
        self.play(FadeIn(at_not), run_time=0.5)
        self.wait(2.0)
        kalan = VGroup(*g[:kesim + 1])
        self.play(Indicate(kalan, color=KIRMIZI, scale_factor=1.02), run_time=1.0)

        ozet = yazi(f"top-p: olasılıklar toplamı 0,9'a ulaşana kadar aday alınır; burada {kesim + 1} aday.", boyut=24,
                    renk_=METIN).move_to([0, -3.15, 0])
        self.play(FadeIn(ozet, shift=UP * 0.1), run_time=0.8)
        self.wait(3.0)

        # Karşılaştırma: emin / kararsız model
        def aday_say_p(Tx):
            t, n = 0.0, 0
            for p in olasiliklar(Tx):
                t += p; n += 1
                if t >= P:
                    return n
            return n
        self.play(FadeOut(VGroup(g, cizgi, etiket, cizikler, at_not, toplamlar, baslik, ozet, ayar)), run_time=0.7)
        satirlar = [("", "top-k = 3", "top-p = 0,9"),
                    ("Model emin (sıcaklık 0,3)", "3 aday", f"{aday_say_p(0.3)} aday"),
                    ("Model kararsız (sıcaklık 1,5)", "3 aday", f"{aday_say_p(1.5)} aday")]
        tablo = VGroup()
        for r, (a, b, c) in enumerate(satirlar):
            kalin = r == 0
            hucre = VGroup(yazi(a, boyut=26, renk_=METIN, kalin=True) if a else yazi(" ", boyut=26),
                           yazi(b, boyut=26, renk_=KARSIT if kalin else METIN, kalin=kalin),
                           yazi(c, boyut=26, renk_=KIRMIZI if kalin else METIN, kalin=kalin))
            hucre[0].move_to([-2.2, 1.4 - r * 0.9, 0], aligned_edge=RIGHT)
            hucre[1].move_to([0.9, 1.4 - r * 0.9, 0])
            hucre[2].move_to([4.0, 1.4 - r * 0.9, 0])
            tablo.add(hucre)
        cizgi_t = Line([-6.2, 0.95, 0], [5.6, 0.95, 0], stroke_color=CIZGI, stroke_width=2)
        self.play(FadeIn(tablo[0]), Create(cizgi_t), run_time=0.6)
        self.play(FadeIn(tablo[1], shift=UP * 0.1), run_time=0.6)
        self.wait(1.2)
        self.play(FadeIn(tablo[2], shift=UP * 0.1), run_time=0.6)
        self.wait(1.5)
        son = VGroup(
            yazi("top-k sabit sayıda aday bırakır.", boyut=26, renk_=METIN),
            yazi("top-p, modelin ne kadar emin olduğuna göre aday sayısını kendisi ayarlar.", boyut=26, renk_=METIN),
            yazi("İkisi birlikte de kullanılabilir. Lab’da sıcaklık ve top-p ile çalışacağız.", boyut=22, renk_=METIN_IKINCIL),
        ).arrange(DOWN, buff=0.18).move_to([0, -1.9, 0])
        self.play(FadeIn(son, shift=UP * 0.1), run_time=0.8)
        self.wait(7.0)
