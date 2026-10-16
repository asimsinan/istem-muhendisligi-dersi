"""M2.6 — Benzer kelimeler neden yakın? (~50 sn)

1) Aynı boşluğa uyan kelimeler benzer cümlelerde geçer ("Bu sabah ___ günü okula gittim").
2) Eğitimde bu kelimelerin vektörleri benzer düzeltmeler alır, birbirine yaklaşır (bu sahne şematik).
3) Gerçek veri: ytu-ce-cosmos/turkish-gpt2 token gömme tablosu (wte, 768 boyut). Seçilen 20 kelimenin
   vektörleri normalize edilip PCA ile 2 boyuta indirildi (aşağıdaki XY, hesap 09.10.2026).
4) Gerçek en yakın komşular (kosinüs benzerliği, aynı tablo): Isparta → Burdur, Afyonkarahisar, Antalya,
   Nazilli, Kütahya; elma → şeftali, erik, meyve, armut, portakal (büyük harfli kopyaları sayılmadı).

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_6_yakinlik.py Yakinlik h02-m2.6-yakinlik
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Dot, Line, FadeIn, FadeOut, LaggedStart, ReplacementTransform, Indicate, UP, DOWN, LEFT, RIGHT,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, METIN, METIN_IKINCIL, CIZGI, KARSIT, PASIF, KART,
)

# Gerçek PCA koordinatları (turkish-gpt2 wte, normalize + PCA)
XY = {
    "elma": (-0.219, -0.518), "armut": (-0.181, -0.51), "erik": (-0.158, -0.551), "şeftali": (-0.2, -0.523), "kiraz": (-0.203, -0.459),
    "pazartesi": (0.612, 0.092), "salı": (0.651, 0.078), "çarşamba": (0.654, 0.084), "perşembe": (0.659, 0.072), "cuma": (0.605, 0.082),
    "Isparta": (-0.337, 0.348), "Burdur": (-0.36, 0.343), "Antalya": (-0.408, 0.468), "Konya": (-0.313, 0.468), "İzmir": (-0.346, 0.496),
    "kırmızı": (-0.115, -0.001), "mavi": (-0.124, 0.036), "sarı": (-0.035, 0.061), "yeşil": (-0.066, -0.011), "turuncu": (-0.116, -0.055),
}
GRUPLAR = [
    ("şehirler", ["Isparta", "Burdur", "Antalya", "Konya", "İzmir"], KIRMIZI, RIGHT),
    ("renkler", ["kırmızı", "mavi", "sarı", "yeşil", "turuncu"], METIN_IKINCIL, RIGHT),
    ("meyveler", ["elma", "armut", "erik", "şeftali", "kiraz"], KARSIT, RIGHT),
    ("günler", ["pazartesi", "salı", "çarşamba", "perşembe", "cuma"], KIRMIZI_KOYU, DOWN),
]


def harita_konum(ad):
    x, y = XY[ad]
    # x: -0.41..0.66 → -4.6..4.6 ; y: -0.55..0.50 → -2.1..1.9
    return [-4.6 + (x + 0.41) / 1.07 * 8.4, -2.3 + (y + 0.55) / 1.05 * 3.9, 0]


def cip(metin, renk_=METIN, kenar=CIZGI):
    t = yazi(metin, boyut=26, renk_=renk_)
    k = kart(t.width + 0.4, 0.6, dolgu=KART, kenar=kenar, kalinlik=2, yaricap=0.12)
    t.move_to(k)
    return VGroup(k, t)


class Yakinlik(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.6")

        # 1) Aynı boşluğa uyan kelimeler
        cumle = VGroup(yazi("Bu sabah", boyut=34, renk_=METIN), yazi("______", boyut=34, renk_=KIRMIZI, kalin=True),
                       yazi("günü okula gittim.", boyut=34, renk_=METIN)).arrange(RIGHT, buff=0.25).move_to([0, 2.6, 0])
        self.play(FadeIn(cumle), run_time=0.8)
        uyan = VGroup(*[cip(a, kenar=KIRMIZI) for a in ["pazartesi", "salı", "çarşamba"]]).arrange(RIGHT, buff=0.3)
        uymayan = cip("elma", renk_=PASIF)
        VGroup(uyan, uymayan).arrange(RIGHT, buff=0.8).move_to([0, 1.3, 0])
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.15) for c in uyan], lag_ratio=0.25), run_time=1.2)
        self.play(FadeIn(uymayan, shift=UP * 0.15), run_time=0.5)
        capraz = Line(uymayan.get_left(), uymayan.get_right(), stroke_color=PASIF, stroke_width=4)
        self.play(FadeIn(capraz), run_time=0.3)
        n1 = yazi("Aynı boşluğa uyan kelimeler, eğitim metninde benzer cümlelerde geçer.", boyut=26, renk_=METIN).move_to([0, 0.2, 0])
        self.play(FadeIn(n1, shift=UP * 0.1), run_time=0.7)
        self.wait(2.6)

        # 2) Eğitimde yaklaşırlar (şematik)
        self.play(FadeOut(VGroup(capraz, n1)), run_time=0.4)
        alan = kart(8.6, 2.9, dolgu=KART, kenar=CIZGI).move_to([0, -1.55, 0])
        sema = yazi("şematik", boyut=16, renk_=PASIF).next_to(alan, DOWN, buff=0.08).align_to(alan, RIGHT)
        bas = {"pazartesi": [-3.2, -0.6], "salı": [2.9, -2.5], "çarşamba": [-0.4, -2.6], "elma": [2.6, -0.5]}
        son = {"pazartesi": [-1.6, -1.3], "salı": [-1.0, -1.75], "çarşamba": [-1.9, -2.0], "elma": [2.6, -0.5]}
        noktalar = {}
        for ad, (x, y) in bas.items():
            renk_ = PASIF if ad == "elma" else KIRMIZI
            d = Dot([x, y, 0], radius=0.11, color=renk_)
            e = yazi(ad, boyut=22, renk_=METIN if ad != "elma" else PASIF).next_to(d, RIGHT, buff=0.12)
            noktalar[ad] = VGroup(d, e)
        n2 = yazi("Eğitim başında vektörler rastgele: kelimeler haritada dağınık.", boyut=24, renk_=METIN_IKINCIL).move_to([0, 0.2, 0])
        self.play(FadeIn(alan), FadeIn(sema), FadeIn(n2), *[FadeIn(v, scale=0.6) for v in noktalar.values()], run_time=1.0)
        self.wait(1.8)
        n3 = yazi("Model boşluğu tahmin ederken bu üçünün vektörleri benzer yönde düzeltilir.", boyut=24, renk_=METIN).move_to(n2)
        self.play(ReplacementTransform(n2, n3), run_time=0.5)
        for adim in range(3):
            anim = []
            for ad in ["pazartesi", "salı", "çarşamba"]:
                b, s = bas[ad], son[ad]
                f = (adim + 1) / 3
                anim.append(noktalar[ad].animate.move_to([b[0] + (s[0] - b[0]) * f + 0.55, b[1] + (s[1] - b[1]) * f, 0]))
            self.play(*anim, run_time=0.8)
        n4 = yazi("Milyarlarca cümle sonra: benzer yerlerde geçenler birbirine yakın.", boyut=24, renk_=KIRMIZI_KOYU, kalin=True).move_to(n3)
        self.play(ReplacementTransform(n3, n4), run_time=0.5)
        self.wait(2.4)

        # 3) Gerçek harita
        self.play(FadeOut(VGroup(cumle, uyan, uymayan, alan, sema, n4, *noktalar.values())), run_time=0.7)
        cerceve = kart(11.4, 5.3, dolgu=KART, kenar=CIZGI).move_to([0, -0.35, 0])
        baslik = VGroup(yazi("Gerçek veri: Türkçe GPT-2'nin gömme tablosu", boyut=24, renk_=METIN, kalin=True),
                        yazi("(768 boyut → 2 boyut; ders sitesindeki modelin kendisi)", boyut=18, renk_=METIN_IKINCIL)
                        ).arrange(DOWN, buff=0.05).next_to(cerceve, UP, buff=0.1)
        self.play(FadeIn(cerceve), FadeIn(baslik), run_time=0.7)
        for ad_g, kelimeler, renk_, yon in GRUPLAR:
            dots = VGroup(*[Dot(harita_konum(k), radius=0.08, color=renk_) for k in kelimeler])
            etiket = VGroup(yazi(ad_g, boyut=22, renk_=renk_, kalin=True),
                            yazi(", ".join(kelimeler), boyut=17, renk_=METIN_IKINCIL)).arrange(DOWN, buff=0.05, aligned_edge=LEFT if yon is RIGHT else RIGHT)
            etiket.next_to(dots, yon, buff=0.3)
            if yon is DOWN:
                etiket.align_to(dots, RIGHT)
            self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in dots], lag_ratio=0.1), FadeIn(etiket), run_time=1.1)
            self.wait(0.5)
        n5 = yazi("Kimse bu grupları modele söylemedi; yalnızca metinlerden öğrendi.", boyut=24, renk_=METIN).next_to(cerceve, DOWN, buff=0.2)
        self.play(FadeIn(n5, shift=UP * 0.1), run_time=0.7)
        self.wait(3.0)

        # 4) Gerçek en yakın komşular
        self.play(*[FadeOut(m) for m in list(self.mobjects)], run_time=0.7)
        self.kunye(2, "M2.6")
        b2 = yazi("Aynı tabloda en yakın vektörler (kosinüs benzerliği)", boyut=24, renk_=METIN_IKINCIL, kalin=True).move_to([0, 2.6, 0])
        satir1 = VGroup(cip("Isparta", kenar=KIRMIZI), yazi("→", boyut=30, renk_=PASIF),
                        yazi("Burdur · Afyonkarahisar · Antalya · Nazilli · Kütahya", boyut=28, renk_=METIN)).arrange(RIGHT, buff=0.3)
        satir2 = VGroup(cip("elma", kenar=KIRMIZI), yazi("→", boyut=30, renk_=PASIF),
                        yazi("şeftali · erik · meyve · armut · portakal", boyut=28, renk_=METIN)).arrange(RIGHT, buff=0.3)
        satir3 = VGroup(cip("pazartesi", kenar=KIRMIZI), yazi("→", boyut=30, renk_=PASIF),
                        yazi("çarşamba · perşembe · salı · cumartesi · cuma", boyut=28, renk_=METIN)).arrange(RIGHT, buff=0.3)
        satirlar = VGroup(satir1, satir2, satir3).arrange(DOWN, buff=0.45, aligned_edge=LEFT).move_to([0, 0.5, 0])
        self.play(FadeIn(b2), run_time=0.5)
        self.play(LaggedStart(*[FadeIn(s, shift=RIGHT * 0.2) for s in satirlar], lag_ratio=0.35), run_time=2.2)
        self.wait(2.0)
        ozet = VGroup(
            yazi("Benzer cümlelerde geçen kelimeler, benzer vektörler kazanır.", boyut=26, renk_=METIN),
            yazi("Hafta 8'deki anlamsal arama da bu fikre dayanır.", boyut=22, renk_=METIN_IKINCIL),
        ).arrange(DOWN, buff=0.16).move_to([0, -2.3, 0])
        self.play(FadeIn(ozet, shift=UP * 0.1), run_time=0.8)
        self.wait(6.0)
