"""M2.1 — BPE adım adım, bir paragraf üzerinde (~77 sn).

Bir Türkçe paragrafta gerçek BPE çalıştırılır (birleştirmeler kodda hesaplanır, sitedeki /h02/bpe
sayfasıyla aynı kural: küçük harf, noktalama yok, kelime sınırı aşılmaz, eşitlikte ilk görülen):
l+a → la (12 kez), la+r → lar (10), e+n → en (8), e+r → er (8), l+er → ler (7), … 18 adımda
192 parça → 101 parça; "öğrenciler", "kitap", "ları" kendi parçaları olur. İlk adımda sayma tek tek
gösterilir. Sonunda gerçek tokenizer'da (GPT, o200k) "students" 1 parça, "öğrencilerimizden" 7 parça.

Render (proje kökünden):
  bash animasyonlar/uret.sh animasyonlar/h02/m2_1_bpe.py Bpe h02-m2.1-bpe
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import (  # noqa: E402
    VGroup, FadeIn, FadeOut, FadeTransform, ReplacementTransform, Indicate, LaggedStart, RoundedRectangle,
    UP, DOWN, LEFT, RIGHT,
)
from stil import (  # noqa: E402
    DersSahnesi, yazi, kod, kart, KIRMIZI, KIRMIZI_KOYU, KIRMIZI_ACIK, METIN, METIN_IKINCIL,
    CIZGI, KARSIT, PASIF, KART, NOTR_KART,
)

PARAGRAF = ("Öğrenciler kütüphaneden kitaplar aldılar. Öğrencilerimiz kitapları akşamları evlerde okudular. "
            "Kitaplardan öğrendiklerini derslerde arkadaşlarına anlattılar. Öğretmenler de öğrencilerden gelen "
            "soruları cevapladılar.")
ADIM_SAYISI = 18

# ---------- BPE (sitedeki src/kutuphane/bpeOgret.ts ile aynı) ----------

def kelimeler_al(metin):
    return re.findall(r"[a-zçğıöşüâîû]+", metin.replace("I", "ı").replace("İ", "i").lower())


def ikilileri_say(kelimeler):
    sayac = {}
    for k in kelimeler:
        for a, b in zip(k, k[1:]):
            sayac[(a, b)] = sayac.get((a, b), 0) + 1
    return sorted(sayac.items(), key=lambda x: -x[1])  # kararlı: eşitlikte ilk görülen


def birlestir(k, a, b):
    """Yeni kelime ve eşleme: yeni parça i ← eski parça indeksleri."""
    yeni, eslem, i = [], [], 0
    while i < len(k):
        if i < len(k) - 1 and k[i] == a and k[i + 1] == b:
            yeni.append(a + b); eslem.append([i, i + 1]); i += 2
        else:
            yeni.append(k[i]); eslem.append([i]); i += 1
    return yeni, eslem


def konumlar(k, a, b):
    out, i = [], 0
    while i < len(k) - 1:
        if k[i] == a and k[i + 1] == b:
            out.append(i); i += 2
        else:
            i += 1
    return out


# ---------- çizim ----------

SOL, SAG, UST = -6.55, 6.55, 3.15
SATIR = 0.66
CIP_Y = 0.5


def cip(metin, durum="harf"):
    renk_yazi = KIRMIZI_KOYU if durum in ("yeni",) else METIN
    t = kod(metin, boyut=21, renk_=renk_yazi)
    dolgu = {"harf": KART, "cok": NOTR_KART, "yeni": KIRMIZI_ACIK, "hedef": KART, "hedefcok": NOTR_KART}[durum]
    kenar = KIRMIZI if durum in ("hedef", "hedefcok", "yeni") else CIZGI
    k = kart(max(t.width + 0.16, 0.3), CIP_Y, dolgu=dolgu, kenar=kenar,
             kalinlik=3.2 if durum.startswith("hedef") else 1.4, yaricap=0.07)
    # taban çizgisi sabit kalsın: yazıyı dikeyde kartın ortasına, harf yüksekliğinden bağımsız koy
    t.move_to(k.get_center())
    return VGroup(k, t)


def paragraf_ciz(kelimeler, hedef=None, yeni=None):
    """Kelime grupları; satırlara sığdırılır. Her kelime VGroup(cip...)."""
    gruplar = []
    for k in kelimeler:
        hk = set()
        if hedef:
            for i in konumlar(k, *hedef):
                hk |= {i, i + 1}
        g = VGroup()
        for i, p in enumerate(k):
            if i in hk:
                d = "hedefcok" if len(p) > 1 else "hedef"
            elif yeni and p == yeni:
                d = "yeni"
            else:
                d = "cok" if len(p) > 1 else "harf"
            g.add(cip(p, d))
        g.arrange(RIGHT, buff=0.035)
        gruplar.append(g)
    x, y = SOL, UST
    for g in gruplar:
        if x + g.width > SAG and x > SOL:
            x, y = SOL, y - SATIR
        g.move_to([x, y, 0], aligned_edge=LEFT)
        x += g.width + 0.26
    return VGroup(*gruplar)


class Bpe(DersSahnesi):
    def construct(self):
        self.kunye(2, "M2.1")
        kelimeler = [list(w) for w in kelimeler_al(PARAGRAF)]
        harf_sayisi = len(set("".join(kelimeler_al(PARAGRAF))))
        toplam = lambda ks: sum(len(k) for k in ks)  # noqa: E731
        BILGI_Y = -1.75

        def bilgi_satiri(*parcalar):
            return VGroup(*parcalar).arrange(RIGHT, buff=0.22).move_to([SOL, BILGI_Y, 0], aligned_edge=LEFT)

        def ikili_cerceve(c1, c2):
            g = VGroup(c1, c2)
            return RoundedRectangle(width=g.width + 0.12, height=g.height + 0.12, corner_radius=0.1,
                                    stroke_color=KIRMIZI, stroke_width=4.5, fill_opacity=0).move_to(g)

        # 0) Düz metin
        ust = yazi("Eğitim metni: bir paragraf", boyut=22, renk_=METIN_IKINCIL, kalin=True).move_to([SOL, 3.75, 0], aligned_edge=LEFT)
        duz = VGroup(*[yazi(s.strip() + ".", boyut=27, renk_=METIN) for s in PARAGRAF.split(".") if s.strip()])
        duz.arrange(DOWN, aligned_edge=LEFT, buff=0.28).move_to([SOL, 1.6, 0], aligned_edge=LEFT)
        self.play(FadeIn(ust), FadeIn(duz, shift=UP * 0.1), run_time=1.0)
        self.wait(2.0)

        # 1) Harflere böl
        par = paragraf_ciz(kelimeler)
        bilgi = bilgi_satiri(yazi("Başta her harf ayrı bir parça.", boyut=26, renk_=METIN))
        sayac = self.sayac_ciz(toplam(kelimeler), harf_sayisi, 0)
        not_ = yazi("(Kolay izlensin diye harfler küçültüldü, noktalama atıldı.)", boyut=18, renk_=PASIF).next_to(bilgi, DOWN, buff=0.14, aligned_edge=LEFT)
        self.play(ReplacementTransform(duz, par), FadeIn(bilgi), FadeIn(sayac), FadeIn(not_), run_time=1.6)
        self.wait(2.2)

        ogrenilen_baslik = yazi("Sözlüğe eklenenler:", boyut=20, renk_=METIN_IKINCIL, kalin=True).move_to([SOL, -2.95, 0], aligned_edge=LEFT)
        OG_X, OG_Y = -3.55, -2.95
        ogrenilen = VGroup()
        self.play(FadeOut(not_), FadeIn(ogrenilen_baslik), run_time=0.5)

        for adim in range(ADIM_SAYISI):
            (a, b), n = ikilileri_say(kelimeler)[0]
            yavas = adim == 0
            orta = 1 <= adim <= 4
            yer = [(ki, i) for ki, k in enumerate(kelimeler) for i in konumlar(k, a, b)]
            cerceveler = VGroup(*[ikili_cerceve(par[ki][i], par[ki][i + 1]) for ki, i in yer])
            b2 = bilgi_satiri(yazi("En sık yan yana gelen ikili:", boyut=26, renk_=METIN_IKINCIL),
                              kod(f"{a} + {b}", boyut=30, renk_=KIRMIZI),
                              yazi(f"→ metinde {n} kez", boyut=26, renk_=METIN, kalin=True))

            # --- say ve çerçevele
            if yavas:
                b1 = bilgi_satiri(yazi("Her kelimede yan yana duran ikililer sayılır. Örnek:", boyut=26, renk_=METIN))
                self.play(FadeTransform(bilgi, b1), run_time=0.6)
                bilgi = b1
                sayi_t = kod(f"{a} + {b} : 0", boyut=30, renk_=KIRMIZI).next_to(b1, RIGHT, buff=0.35)
                self.play(FadeIn(sayi_t), run_time=0.3)
                for j, c in enumerate(cerceveler):
                    yeni_say = kod(f"{a} + {b} : {j + 1}", boyut=30, renk_=KIRMIZI).move_to(sayi_t, aligned_edge=LEFT)
                    self.play(FadeIn(c, scale=1.15), ReplacementTransform(sayi_t, yeni_say), run_time=0.38 if j < 4 else 0.22)
                    sayi_t = yeni_say
                self.wait(0.8)
                b3 = yazi("Diğer ikililer de böyle sayılır; en çok geçen kazanır.", boyut=22, renk_=METIN_IKINCIL)
                b3.next_to(b2, DOWN, buff=0.14, aligned_edge=LEFT)
                self.play(FadeTransform(VGroup(bilgi, sayi_t), b2), FadeIn(b3), run_time=0.7)
                bilgi = VGroup(b2, b3)
                self.wait(2.4)
            else:
                self.play(LaggedStart(*[FadeIn(c, scale=1.15) for c in cerceveler], lag_ratio=0.05),
                          FadeTransform(bilgi, b2), run_time=0.9 if orta else 0.5)
                bilgi = b2
                self.wait(1.3 if orta else 0.4)

            # --- birleştir
            yeni_kel, eslemler = [], []
            for k in kelimeler:
                yk, es = birlestir(k, a, b)
                yeni_kel.append(yk); eslemler.append(es)
            kelimeler = yeni_kel
            yeni_son = a + b
            yeni_par = paragraf_ciz(kelimeler, yeni=yeni_son)
            # Değişmeyen parçalar yalnızca yer değiştirir (yazı biçimi dönüştürülmez, karmaşa olmasın);
            # birleşen ikili yeni yerine kayarak söner, yerine birleşmiş parça belirir.
            donusum, eslesen, gelenler = [], [], []
            for ki, es in enumerate(eslemler):
                for yi, eskiler in enumerate(es):
                    hedef = yeni_par[ki][yi]
                    if len(eskiler) == 1:
                        eski = par[ki][eskiler[0]]
                        donusum.append(eski.animate.move_to(hedef))
                        eslesen.append((eski, hedef))
                    else:
                        cift = VGroup(*[par[ki][e] for e in eskiler])
                        donusum.append(cift.animate.move_to(hedef).set_opacity(0))
                        gelenler.append(hedef)
                        eslesen.append((cift, None))
            donusum.append(LaggedStart(*[FadeIn(h, scale=0.85) for h in gelenler], lag_ratio=0.02))
            ogrenilen_cip = cip(yeni_son, "yeni")
            if len(ogrenilen) == 0:
                ogrenilen_cip.move_to([OG_X, OG_Y, 0], aligned_edge=LEFT)
            else:
                ogrenilen_cip.next_to(ogrenilen[-1], RIGHT, buff=0.1)
                if ogrenilen_cip.get_right()[0] > SAG:
                    ogrenilen_cip.move_to([OG_X, OG_Y - 0.6, 0], aligned_edge=LEFT)
            yeni_sayac = self.sayac_ciz(toplam(kelimeler), harf_sayisi, adim + 1)
            ek_anim = []
            if yavas:
                metin_b = bilgi_satiri(kod(f"{a} + {b}", boyut=30, renk_=KIRMIZI), yazi("→", boyut=30, renk_=METIN_IKINCIL),
                                       kod(yeni_son, boyut=30, renk_=KIRMIZI),
                                       yazi("her yerde birleşir ve sözlüğe eklenir.", boyut=26, renk_=METIN))
                ek_anim.append(FadeTransform(bilgi, metin_b))
                bilgi = metin_b
            self.play(*donusum, FadeOut(cerceveler), ReplacementTransform(sayac, yeni_sayac),
                      FadeIn(ogrenilen_cip, shift=UP * 0.15), *ek_anim, run_time=1.1 if yavas else (0.8 if orta else 0.5))
            ogrenilen.add(ogrenilen_cip)
            for eski, hedef in eslesen:  # yer değiştirenleri yeni (doğru renkli) parçalarla değiştir
                self.remove(eski)
                if hedef is not None:
                    self.add(hedef)
            sayac = yeni_sayac
            par = yeni_par
            if yavas:
                self.wait(2.2)
            elif adim == 1:
                ek = yazi("Yeni parça da birleşebilir: la + r → lar, Türkçenin çoğul eki.", boyut=24, renk_=KIRMIZI_KOYU)
                ek.next_to(bilgi, DOWN, buff=0.14, aligned_edge=LEFT)
                self.play(FadeIn(ek), run_time=0.4)
                self.wait(2.4)
                self.play(FadeOut(ek), run_time=0.3)
            elif orta:
                self.wait(0.9)
            else:
                self.wait(0.25)

        # Özet: öğrenilen kelime parçaları
        ozet1 = bilgi_satiri(yazi(f"{ADIM_SAYISI} birleştirmeden sonra aynı paragraf {toplam(kelimeler)} parça (başta 192).", boyut=26, renk_=METIN))
        ozet2 = yazi("Kimse ek ya da kök öğretmedi; yalnızca sayıldı.", boyut=26, renk_=KIRMIZI_KOYU, kalin=True)
        ozet2.next_to(ozet1, DOWN, buff=0.16, aligned_edge=LEFT)
        self.play(FadeTransform(bilgi, ozet1), run_time=0.6)
        vurgu = [par[ki][pi] for ki, k in enumerate(kelimeler) for pi, p in enumerate(k) if p in ("öğrenciler", "kitap", "lar", "ları", "ler")]
        self.play(LaggedStart(*[Indicate(v, color=KIRMIZI, scale_factor=1.12) for v in vurgu], lag_ratio=0.04), run_time=1.8)
        self.play(FadeIn(ozet2, shift=UP * 0.1), run_time=0.6)
        self.wait(3.4)

        # 3) Gerçek tokenizer
        self.play(FadeOut(VGroup(ust, par, ozet1, ozet2, sayac, ogrenilen, ogrenilen_baslik)), run_time=0.8)
        baslik2 = yazi("Gerçek sözlükler: aynı yöntem, milyarlarca kelimelik metin, ~200 bin parça", boyut=24,
                       renk_=METIN_IKINCIL, kalin=True).move_to([0, 2.6, 0])
        en_ad = yazi("students", boyut=26, renk_=METIN_IKINCIL).move_to([-6.4, 1.0, 0], aligned_edge=LEFT)
        en_cip = VGroup(cip("students", "cok")).move_to([-2.4, 1.0, 0], aligned_edge=LEFT)
        en_say = yazi("1 parça", boyut=26, renk_=KARSIT, kalin=True).move_to([4.6, 1.0, 0], aligned_edge=LEFT)
        tr_ad = yazi("öğrencilerimizden", boyut=26, renk_=METIN_IKINCIL).move_to([-6.4, -0.3, 0], aligned_edge=LEFT)
        tr_cip = VGroup(*[cip(p, "cok" if len(p) > 1 else "harf") for p in ["ö", "ğ", "r", "enc", "iler", "imiz", "den"]]).arrange(RIGHT, buff=0.06)
        tr_cip.move_to([-2.4, -0.3, 0], aligned_edge=LEFT)
        tr_say = yazi("7 parça", boyut=26, renk_=KIRMIZI, kalin=True).move_to([4.6, -0.3, 0], aligned_edge=LEFT)
        kaynak = yazi("GPT tokenizer'ı (o200k)", boyut=18, renk_=PASIF).next_to(VGroup(tr_ad, tr_cip), DOWN, buff=0.3, aligned_edge=LEFT)
        self.play(FadeIn(baslik2), run_time=0.7)
        self.play(FadeIn(en_ad), FadeIn(en_cip, shift=RIGHT * 0.2), FadeIn(en_say), run_time=0.8)
        self.wait(0.8)
        self.play(FadeIn(tr_ad), LaggedStart(*[FadeIn(c, shift=RIGHT * 0.15) for c in tr_cip], lag_ratio=0.18), FadeIn(kaynak), run_time=1.4)
        self.play(FadeIn(tr_say), run_time=0.4)
        self.wait(1.0)
        ozet = VGroup(
            yazi("Eğitim metninde sık geçen diziler büyük parçalara birleşir.", boyut=24, renk_=METIN),
            yazi("Metnin çoğu İngilizce: İngilizce kelimeler tek parça, Türkçe kelimeler yarı yolda kalır.", boyut=24, renk_=METIN),
        ).arrange(DOWN, buff=0.2).move_to([0, -2.2, 0])
        self.play(FadeIn(ozet, shift=UP * 0.1), run_time=0.9)
        self.wait(6.0)

    def sayac_ciz(self, parca, harf, yeni):
        g = VGroup(
            yazi(f"{parca}", boyut=34, renk_=KIRMIZI, kalin=True), yazi("parça", boyut=20, renk_=METIN_IKINCIL),
            yazi(f"{harf + yeni}", boyut=34, renk_=KARSIT, kalin=True), yazi(f"sözlükte ({harf} harf + {yeni} yeni)", boyut=20, renk_=METIN_IKINCIL),
        )
        g[1].next_to(g[0], RIGHT, buff=0.12, aligned_edge=DOWN)
        g[2].next_to(g[1], RIGHT, buff=0.45).align_to(g[0], DOWN)
        g[3].next_to(g[2], RIGHT, buff=0.12, aligned_edge=DOWN)
        g.move_to([SAG, 3.75, 0], aligned_edge=RIGHT)
        return g
