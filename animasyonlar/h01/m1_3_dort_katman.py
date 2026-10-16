"""M1.3 — Dört katman: İstem → Bağlam → Harness → Döngü (imza animasyon).

Render (proje kökünden):
  manim -qh animasyonlar/h01/m1_3_dort_katman.py DortKatman      # tam sürüm (~40 sn)
  manim -qh animasyonlar/h01/m1_3_dort_katman.py DortKatmanKisa  # açılış sürümü (~8 sn)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Create, FadeIn, FadeOut, Write, Indicate, Rotate, ArcBetweenPoints,
    CurvedArrow, LaggedStart, AnimationGroup, UP, DOWN, LEFT, RIGHT, ORIGIN, PI,
    smooth, there_and_back, linear,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kart, KIRMIZI, KIRMIZI_ACIK, KIRMIZI_KOYU, METIN, NOTR_KART,
    METIN_IKINCIL, CIZGI, KARSIT, PASIF, KART, ZEMIN,
)

KATMANLAR = [
    # (ad, açıklama, örnek)
    ("İSTEM", "İyi sormak", "“Bu metni 3 maddede özetle.”"),
    ("BAĞLAM", "Doğru bilgiyi masaya koymak", "Yönetmelik PDF'i + sohbet geçmişi"),
    ("HARNESS", "Araçlar ve izinler", "Yalnızca search ve calculator açık"),
    ("DÖNGÜ", "Kontrol et, düzelt, dur", "Yaz → test et → düzelt → en fazla 5 kez"),
]

# İç içe kutu ölçüleri (içten dışa)
OLCULER = [(2.2, 1.0), (3.3, 1.95), (4.4, 2.9), (5.5, 3.85)]
MERKEZ = LEFT * 3.65 + UP * 0.1


def katman_kutusu(i: int):
    g, y = OLCULER[i]
    if i == 0:
        k = kart(g, y, dolgu=KIRMIZI, kenar=KIRMIZI, kalinlik=0, yaricap=0.22)
    else:
        # Dışa doğru açılan tonlar: kırmızı ağırlığı azalır
        dolgu = [None, NOTR_KART, KART, ZEMIN][i]
        kenar = [None, KIRMIZI, KARSIT, KARSIT][i]
        k = kart(g, y, dolgu=dolgu, kenar=kenar, kalinlik=3, yaricap=0.22)
        if i == 3:
            k.set_stroke(width=3, opacity=0.9)
    k.move_to(MERKEZ)
    return k


def katman_etiketi(i: int, kutu):
    ad = KATMANLAR[i][0]
    renk_ = KART if i == 0 else (KIRMIZI if i == 1 else KARSIT)
    e = yazi(ad, boyut=24 if i == 0 else 19, renk_=renk_, kalin=True)
    if i == 0:
        e.move_to(kutu.get_center())
    else:
        # Kutunun üst kenarının hemen altına, sol hizalı
        e.next_to(kutu.get_corner(UP + LEFT), DOWN + RIGHT, buff=0.14)
    return e


def aciklama_blogu(i: int):
    ad, ack, ornek = KATMANLAR[i]
    no = yazi(f"{i + 1}", boyut=26, renk_=KART, kalin=True)
    daire = kart(0.54, 0.54, dolgu=KIRMIZI if i == 0 else (KIRMIZI if i == 1 else KARSIT),
                 kenar=ZEMIN, kalinlik=0, yaricap=0.27)
    no.move_to(daire)
    rozet = VGroup(daire, no)
    baslik = yazi(ack, boyut=26, renk_=METIN, kalin=True)
    alt = yazi(ornek, boyut=19, renk_=METIN_IKINCIL)
    metin = VGroup(baslik, alt).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
    blok = VGroup(rozet, metin).arrange(RIGHT, buff=0.3, aligned_edge=UP)
    return blok


class DortKatman(DersSahnesi):
    def construct(self):
        self.kunye(1, "M1.3")

        # Kural: videoda başlık yok; başlığı slayt verir.

        kutular, etiketler, bloklar = [], [], []
        blok_x = 0.55
        blok_y = [1.75, 0.7, -0.35, -1.4]

        for i in range(4):
            kutu = katman_kutusu(i)
            etiket = katman_etiketi(i, kutu)
            blok = aciklama_blogu(i)
            blok.move_to([blok_x, blok_y[i], 0], aligned_edge=LEFT)

            # Yeni katman, eskilerin ARKASINA eklenir (iç kutular üstte kalsın)
            self.bring_to_back(kutu)
            if i == 0:
                self.play(FadeIn(kutu, scale=0.8), run_time=1.0)
            else:
                self.play(Create(kutu), run_time=1.4, rate_func=smooth)
                self.bring_to_back(kutu)
            self.play(Write(etiket), FadeIn(blok, shift=LEFT * 0.3), run_time=1.2)
            self.wait(2.6)
            kutular.append(kutu)
            etiketler.append(etiket)
            bloklar.append(blok)

        # Döngü vurgusu: dış kutunun etrafında dönen ok
        dis = kutular[3]
        ok = CurvedArrow(dis.get_corner(DOWN + RIGHT) + RIGHT * 0.15 + UP * 0.3,
                         dis.get_corner(UP + RIGHT) + RIGHT * 0.15 + DOWN * 0.3,
                         angle=PI / 2.2, color=KIRMIZI, stroke_width=6)
        self.play(Create(ok), run_time=1.2)
        self.play(Indicate(bloklar[3], color=KIRMIZI, scale_factor=1.04), run_time=1.2)
        self.wait(1.0)

        # Son kare: "temel istemdir" mesajı
        not_ = yazi("Temel hâlâ iyi istemdir; ama tek başına yetmez.", boyut=26,
                    renk_=KIRMIZI_KOYU, kalin=True)
        not_.to_edge(DOWN, buff=0.55)
        self.play(Indicate(kutular[0], color=KIRMIZI_KOYU, scale_factor=1.08),
                  FadeIn(not_, shift=UP * 0.2), run_time=1.5)
        self.wait(4)


class DortKatmanKisa(DersSahnesi):
    """Her destenin açılışında: 4 katman hızla kurulur, o haftanın katmanı yanıp söner."""

    vurgulanan = 1  # 0=İstem … 3=Döngü (hafta değişince değişir)

    def construct(self):
        kutular, etiketler = [], []
        for i in range(4):
            k = katman_kutusu(i).move_to(ORIGIN + DOWN * 0.1)
            kutular.append(k)
        for i in range(4):
            etiketler.append(katman_etiketi(i, kutular[i]))
        for i in range(4):
            self.bring_to_back(kutular[i])
            self.play(FadeIn(kutular[i], scale=0.9), FadeIn(etiketler[i]), run_time=0.6)
        self.wait(0.4)
        v = self.vurgulanan
        self.play(Indicate(etiketler[v], color=KIRMIZI, scale_factor=1.25), run_time=1.2)
        burasi = yazi("Bugün buradayız", boyut=26, renk_=KIRMIZI, kalin=True)
        burasi.next_to(kutular[3], DOWN, buff=0.3)
        self.play(FadeIn(burasi, shift=UP * 0.2), run_time=0.8)
        self.wait(2.5)
