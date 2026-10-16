"""M3.2 — Zero-shot ve few-shot: örnekler kalıbı kilitler (~30 sn).

Aynı yorum beş kez soruluyor. Örneksizken cevaplar beş farklı biçimde; bir örnekle çoğu toparlanıyor;
üç örnekle beşi de aynı JSON kalıbında. Cevaplar şematik (tipik gözlemler), gerçek model çıktısı değil.
Örnekler slayt "Few-shot: üç örnek" ile aynı.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h03/m3_2_fewshot.py FewShot h03-m3.2-fewshot
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, Rectangle, FadeIn, FadeOut, LaggedStart, ReplacementTransform, Transform, UP, DOWN, LEFT, RIGHT,
    interpolate_color,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL, CIZGI, KARSIT,
    PASIF, KART, NOTR_KART,
)

YORUM = "“Telefon harika ama şarj aleti iki günde bozuldu.”"
ORNEKLER = [("Paketleme özenliydi, blender çok güçlü.", "olumlu", 5),
            ("Kamera iyi ama hoparlör cızırtılı.", "karışık", 3),
            ("Süper, kılavuz bile eksik çıktı.", "olumsuz", 1)]
JSON = '{"duygu": "karışık", "puan": 3}'
CEVAPLAR = {
    0: ["Bu yorum karışık duygular içeriyor. Puanım: 3/5.",
        "Puan: 3",
        "Duygu: Karışık — 3 yıldız",
        "3",
        "Olumlu yönleri var ama… 2,5 / 5 diyebilirim."],
    1: [JSON, JSON, "Puan: 3 (karışık)", JSON, '{"duygu": "karışık", "puan": "üç"}'],
    3: [JSON] * 5,
}
CX = 2.7          # cevap sütunu ortası
CY0 = 1.55        # ilk cevap satırı
CDY = 0.82


def cevap_satiri(i, metin, duzgun):
    c = kart(6.4, 0.62, dolgu=KART, kenar=KIRMIZI if duzgun else CIZGI, kalinlik=2.5 if duzgun else 2, yaricap=0.1)
    c.move_to([CX, CY0 - i * CDY, 0])
    yaz = kod(metin, boyut=19, renk_=METIN) if metin.startswith("{") else yazi(metin, boyut=20, renk_=METIN)
    if yaz.width > 6.0:
        yaz.scale_to_fit_width(6.0)
    yaz.move_to(c)
    no = yazi(f"{i + 1}.", boyut=18, renk_=PASIF).next_to(c, LEFT, buff=0.15)
    return VGroup(c, yaz, no)


def cevaplar(n):
    return VGroup(*[cevap_satiri(i, m, m == JSON) for i, m in enumerate(CEVAPLAR[n])])


class FewShot(DersSahnesi):
    def construct(self):
        self.kunye(3, "M3.2")

        # Sol: istem
        istem = kart(5.3, 5.6).move_to([-4.15, -0.05, 0])
        ib = yazi("İstem", boyut=22, renk_=METIN_IKINCIL, kalin=True).next_to(istem.get_top(), DOWN, buff=0.2).align_to(istem, LEFT).shift(RIGHT * 0.3)
        talimat = yazi("Duygusunu ve 1–5 puanını belirle.", boyut=20, renk_=METIN).next_to(ib, DOWN, buff=0.18).align_to(ib, LEFT)
        yorum = VGroup(yazi("Yorum:", boyut=18, renk_=METIN_IKINCIL, kalin=True),
                       yazi(YORUM, boyut=18, renk_=KARSIT, kalin=True)).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
        if yorum.width > 4.7:
            yorum.scale_to_fit_width(4.7)
        yorum.next_to(istem.get_bottom(), UP, buff=0.3).align_to(ib, LEFT)
        sayac = yazi("Örnek sayısı: 0", boyut=26, renk_=KIRMIZI, kalin=True).move_to([-4.15, 3.25, 0])
        bas = yazi("Aynı yorum, beş ayrı istek", boyut=26, renk_=METIN_IKINCIL, kalin=True).move_to([CX, 3.25, 0])

        self.play(FadeIn(istem), FadeIn(ib), FadeIn(talimat), FadeIn(yorum), FadeIn(sayac), FadeIn(bas), run_time=0.8)
        self.wait(0.8)

        # Örneksiz: dağınık
        c0 = cevaplar(0)
        self.play(LaggedStart(*[FadeIn(c, shift=LEFT * 0.2) for c in c0], lag_ratio=0.25), run_time=1.6)
        n = yazi("Örneksiz: beş cevap, beş farklı biçim", boyut=22, renk_=METIN).move_to([CX, -2.75, 0])
        self.play(FadeIn(n), run_time=0.4)
        self.wait(4.5)

        def ornek_kutusu(k):
            yo, du, pu = ORNEKLER[k]
            g = VGroup(yazi(yo, boyut=15, renk_=METIN),
                       kod(f'{{"duygu": "{du}", "puan": {pu}}}', boyut=14, renk_=KIRMIZI_KOYU)).arrange(DOWN, buff=0.06, aligned_edge=LEFT)
            c = kart(4.7, 0.82, dolgu=KIRMIZI_ACIK, kenar=KIRMIZI_ACIK, yaricap=0.08)
            c.next_to(talimat, DOWN, buff=0.22 + k * 0.94).align_to(talimat, LEFT).shift(LEFT * 0.05)
            g.move_to(c).align_to(c, LEFT).shift(RIGHT * 0.15)
            return VGroup(c, g)

        # 1 örnek
        o1 = ornek_kutusu(0)
        s1 = yazi("Örnek sayısı: 1", boyut=26, renk_=KIRMIZI, kalin=True).move_to(sayac)
        self.play(FadeIn(o1, shift=DOWN * 0.15), Transform(sayac, s1), run_time=0.7)
        c1 = cevaplar(1)
        n1 = yazi("Bir örnek: çoğu toparlandı, ikisi hâlâ kaçıyor", boyut=22, renk_=METIN).move_to(n)
        self.play(ReplacementTransform(c0, c1), ReplacementTransform(n, n1), run_time=1.0)
        self.wait(4.5)

        # 3 örnek
        o2, o3 = ornek_kutusu(1), ornek_kutusu(2)
        s3 = yazi("Örnek sayısı: 3", boyut=26, renk_=KIRMIZI, kalin=True).move_to(sayac)
        self.play(FadeIn(o2, shift=DOWN * 0.15), FadeIn(o3, shift=DOWN * 0.15), Transform(sayac, s3), run_time=0.8)
        c3 = cevaplar(3)
        n3 = yazi("Üç örnek: beşi de aynı kalıpta", boyut=22, renk_=KIRMIZI_KOYU, kalin=True).move_to(n)
        self.play(ReplacementTransform(c1, c3), ReplacementTransform(n1, n3), run_time=1.0)
        self.wait(3.0)

        ozet = VGroup(yazi("Örnekler cevabın biçimini kilitler.", boyut=26, renk_=METIN, kalin=True),
                      yazi("Etiketin doğru olduğunu ise ölçmek gerekir.", boyut=22, renk_=METIN_IKINCIL)) \
            .arrange(DOWN, buff=0.1).move_to([CX, -2.85, 0])
        self.play(FadeOut(n3), FadeIn(ozet, shift=UP * 0.1), run_time=0.7)
        self.wait(7.0)
