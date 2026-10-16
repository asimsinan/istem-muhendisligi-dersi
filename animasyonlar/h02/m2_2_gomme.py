"""M2.2 — Sözlük → numara → gömme tablosunun satırı → vektör; tablo eğitimde öğrenilir; konum eklenir (~55 sn).

Numaralar ve ilk 12 sayı gerçek: ytu-ce-cosmos/turkish-gpt2 (Transformer Explainer · Türkçe ile aynı model),
token gömme (wte) ve konum gömme (wpe) tablolarından. "Eğitim" sahnesindeki ara aşamalar şematiktir
(rastgele başlangıçtan gerçek değerlere doğrusal geçiş). Benzer kelimelerin yakınlığı M2.6'da (gerçek veri).

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_2_gomme.py Gomme h02-m2.2-gomme
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, Line, Arrow, Dot, FadeIn, FadeOut, GrowArrow, Create, LaggedStart,
    TransformFromCopy, ReplacementTransform, Indicate, UP, DOWN, LEFT, RIGHT, ManimColor, interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT, PASIF,
    KART, NOTR_KART, ZEMIN,
)

TOKENLER = ["Öğretmen", " ders", " anlattı"]
IDLER = [17261, 2167, 6682]
W = [[0.022, -0.01, 0.043, 0.075, 0.057, -0.006, -0.108, -0.031, -0.068, -0.004, -0.016, 0.007],
     [-0.053, -0.011, 0.009, -0.031, -0.027, 0.061, 0.023, -0.029, -0.025, -0.008, -0.034, -0.01],
     [0.013, -0.038, -0.015, 0.01, -0.056, -0.033, 0.02, -0.026, 0.023, -0.006, -0.058, 0.023]]
P = [[-0.028, -0.014, 0.026, -0.093, 0.02, 0.015, 0.004, 0.06, 0.018, 0.009, -0.032, -0.001],
     [-0.046, -0.008, 0.042, -0.093, 0.013, -0.022, 0.021, 0.023, 0.005, -0.01, -0.026, -0.016],
     [-0.033, -0.002, 0.033, -0.063, 0.007, 0.012, 0.005, 0.034, -0.009, 0.007, -0.025, -0.017]]
OLCEK = 0.11
HUCRE = 0.30


def hucre_rengi(v):
    t = min(abs(v) / OLCEK, 1.0)
    hedef = KIRMIZI if v >= 0 else KARSIT
    return interpolate_color(KART, hedef, 0.15 + 0.85 * t)


def serit(degerler):
    g = VGroup(*[Rectangle(width=HUCRE, height=0.42, stroke_color=CIZGI, stroke_width=1,
                           fill_color=hucre_rengi(v), fill_opacity=1) for v in degerler])
    g.arrange(RIGHT, buff=0)
    devam = yazi("…", boyut=26, renk_=PASIF).next_to(g, RIGHT, buff=0.12)
    return VGroup(g, devam)


def sayilar(degerler, n=4):
    s = ", ".join(f"{v:+.2f}".replace("+", "") for v in degerler[:n])
    return kod(f"[{s}, …]", boyut=17, renk_=METIN_IKINCIL)


def cip(metin, boyut=28):
    t = kod(metin.strip(), boyut=boyut, renk_=METIN)
    k = kart(t.width + 0.4, 0.62, dolgu=KART, kenar=CIZGI, kalinlik=2, yaricap=0.12)
    t.move_to(k)
    return VGroup(k, t)


class Gomme(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.2")
        Y_SERIT = [1.05, -0.35, -1.75]

        # 1) Sözlük → numara: BPE'nin oluşturduğu sözlükte her parçanın bir sıra numarası var
        soz = kart(4.6, 3.7, dolgu=NOTR_KART, kenar=CIZGI).move_to([3.9, 0.6, 0])
        soz_ad = VGroup(yazi("BPE sözlüğü · 50.257 parça", boyut=20, renk_=METIN, kalin=True),
                        yazi("her parçanın bir sıra numarası var", boyut=16, renk_=METIN_IKINCIL)
                        ).arrange(DOWN, buff=0.05).next_to(soz.get_top(), DOWN, buff=0.18)
        SOZ = [(2066, "␣kitap"), (2167, "␣ders"), (6682, "␣anlattı"), (12693, "␣Isparta"), (17261, "Öğretmen")]
        soz_satir = VGroup(*[VGroup(kod(f"#{n}", boyut=20, renk_=KIRMIZI), kod(t, boyut=20, renk_=METIN)).arrange(RIGHT, buff=0.35)
                             for n, t in SOZ]).arrange(DOWN, buff=0.14, aligned_edge=LEFT)
        nokta = yazi("…", boyut=22, renk_=PASIF)
        soz_satir.add(nokta)
        soz_satir.arrange(DOWN, buff=0.12, aligned_edge=LEFT).next_to(soz_ad, DOWN, buff=0.22).align_to(soz, LEFT).shift(RIGHT * 0.45)
        self.play(FadeIn(soz), FadeIn(soz_ad), LaggedStart(*[FadeIn(s, shift=LEFT * 0.1) for s in soz_satir], lag_ratio=0.1), run_time=1.3)
        self.wait(1.2)
        cipler = VGroup(*[cip(t) for t in TOKENLER]).arrange(RIGHT, buff=0.35).move_to([-3.2, 3.05, 0])
        self.play(LaggedStart(*[FadeIn(c, shift=DOWN * 0.15) for c in cipler], lag_ratio=0.2), run_time=1.0)
        numaralar = VGroup(*[kod(f"#{i}", boyut=22, renk_=KIRMIZI) for i in IDLER])
        for n, c in zip(numaralar, cipler):
            n.next_to(c, DOWN, buff=0.22)
        not1 = yazi("sözlükteki numarası (token ID)", boyut=18, renk_=METIN_IKINCIL).next_to(numaralar, DOWN, buff=0.15)
        kaynak_sira = [4, 1, 2]
        self.play(*[TransformFromCopy(soz_satir[kaynak_sira[k]][0], numaralar[k]) for k in range(3)], FadeIn(not1), run_time=1.3)
        self.wait(1.4)
        self.play(FadeOut(VGroup(soz, soz_ad, soz_satir)), run_time=0.6)
        # 2) Gömme tablosu
        tablo = kart(3.0, 3.6, dolgu=NOTR_KART, kenar=CIZGI).move_to([-4.9, -0.6, 0])
        cizgiler = VGroup(*[Line(tablo.get_left() + RIGHT * 0.15 + UP * (1.65 - 0.2 * i),
                                 tablo.get_right() + LEFT * 0.15 + UP * (1.65 - 0.2 * i),
                                 stroke_color=CIZGI, stroke_width=1).shift(DOWN * 0.6) for i in range(17)])
        tablo_ad = VGroup(yazi("Gömme tablosu", boyut=20, renk_=METIN, kalin=True),
                          yazi("50.257 satır · her satır 768 sayı", boyut=15, renk_=METIN_IKINCIL),
                          yazi("token numarası = satır numarası", boyut=15, renk_=KIRMIZI)
                          ).arrange(DOWN, buff=0.06).next_to(tablo, DOWN, buff=0.15)
        self.play(FadeIn(tablo), Create(cizgiler), FadeIn(tablo_ad), run_time=1.0)

        seritler, etiketler, numara_yazilari = [], [], []
        satir_y = [1.05 - 0.6 - 0.2 * 3, 1.05 - 0.6 - 0.2 * 9, 1.05 - 0.6 - 0.2 * 13]
        for k in range(3):
            vurgu = Rectangle(width=2.7, height=0.2, fill_color=KIRMIZI, fill_opacity=0.85, stroke_width=0)
            vurgu.move_to([tablo.get_center()[0], satir_y[k], 0])
            s = serit(W[k]).move_to([-0.2, Y_SERIT[k], 0], aligned_edge=LEFT)
            et = kod(TOKENLER[k].strip(), boyut=22, renk_=METIN).next_to(s, LEFT, buff=0.3)
            sy = sayilar(W[k]).next_to(s[0], DOWN, buff=0.08, aligned_edge=LEFT)
            self.play(TransformFromCopy(numaralar[k], vurgu), run_time=0.7)
            self.play(TransformFromCopy(vurgu, s[0]), FadeIn(s[1]), FadeIn(et), FadeIn(sy), FadeOut(vurgu),
                      run_time=0.9)
            seritler.append(s); etiketler.append(et); numara_yazilari.append(sy)
        uzunluk = yazi("her token için 768 sayılık bir liste: vektör", boyut=20, renk_=METIN_IKINCIL)
        uzunluk.move_to([3.0, 2.2, 0])
        self.play(FadeIn(uzunluk), run_time=0.6)
        self.wait(1.6)
        # 2b) Tabloyu kim yazdı? Eğitim: başta rastgele, her tahmin hatasında biraz düzeltilir
        soru = yazi("Bu sayıları kim yazdı? Kimse:", boyut=22, renk_=METIN, kalin=True).move_to([3.0, 2.2, 0])
        self.play(ReplacementTransform(uzunluk, soru), run_time=0.6)
        import random
        rnd = random.Random(7)
        rastgele = [rnd.uniform(-0.11, 0.11) for _ in range(12)]
        asamalar = [rastgele] + [[r + (w - r) * f for r, w in zip(rastgele, W[0])] for f in (0.35, 0.7, 1.0)]
        etiket_y = [3.0, 2.2 - 0.45, 0]
        aciklamalar = ["eğitim başında: rastgele sayılar",
                       "model sıradaki token'ı tahmin eder, yanılır",
                       "her yanlışta sayılar biraz düzeltilir",
                       "milyarlarca cümle sonra: öğrenilmiş sayılar"]
        ack = yazi(aciklamalar[0], boyut=19, renk_=METIN_IKINCIL).next_to(soru, DOWN, buff=0.18)
        s0 = serit(rastgele)[0].move_to(seritler[0][0])
        self.play(ReplacementTransform(seritler[0][0], s0), FadeIn(ack), run_time=0.9)
        self.wait(1.2)
        simdiki = s0
        for a in range(1, 4):
            yeni_ack = yazi(aciklamalar[a], boyut=19, renk_=METIN_IKINCIL).move_to(ack)
            yeni_s = serit(asamalar[a])[0].move_to(simdiki)
            self.play(ReplacementTransform(simdiki, yeni_s), ReplacementTransform(ack, yeni_ack), run_time=0.9)
            simdiki, ack = yeni_s, yeni_ack
            self.wait(0.8 if a < 3 else 1.6)
        seritler[0] = VGroup(simdiki, seritler[0][1])
        self.play(FadeOut(VGroup(soru, ack)), run_time=0.5)
        uzunluk = VGroup()

        # 3) Konum bilgisi eklenir
        konumlar = []
        for k in range(3):
            ks = serit(P[k])[0].scale(0.6).next_to(seritler[k][1], RIGHT, buff=0.3)
            ke = yazi(f"+ {k + 1}. sıra", boyut=16, renk_=METIN_IKINCIL).next_to(ks, DOWN, buff=0.06)
            konumlar.append(VGroup(ks, ke))
        self.play(LaggedStart(*[FadeIn(k, shift=LEFT * 0.2) for k in konumlar], lag_ratio=0.15), run_time=1.0)
        self.wait(1.6)
        toplamlar = []
        for k in range(3):
            yeni = serit([a + b for a, b in zip(W[k], P[k])]).move_to(seritler[k], aligned_edge=LEFT)
            toplamlar.append(yeni)
        konum_not = yazi("sıra bilgisi eklendi: aynı kelime farklı yerde farklı vektör", boyut=20,
                         renk_=METIN_IKINCIL).move_to([3.0, -2.75, 0])
        self.play(*[ReplacementTransform(VGroup(seritler[k], konumlar[k]), toplamlar[k]) for k in range(3)],
                  *[FadeOut(n) for n in numara_yazilari], FadeIn(konum_not), run_time=1.1)
        self.wait(3.2)

        # 4) Özet
        hepsi = VGroup(cipler, numaralar, not1, tablo, cizgiler, tablo_ad, konum_not)
        ozet = VGroup(
            yazi("token → sözlükteki numarası → tablodaki satırı (+ sıra bilgisi) = vektör", boyut=24, renk_=METIN),
            yazi("Tablonun sayıları eğitimde öğrenilir; model metni bu vektörlerle işler.", boyut=22, renk_=METIN_IKINCIL),
        ).arrange(DOWN, buff=0.16).move_to([0, -3.05, 0])
        self.play(FadeOut(VGroup(konum_not, tablo, cizgiler, tablo_ad)), FadeIn(ozet, shift=UP * 0.1), run_time=0.8)
        self.wait(6.0)
