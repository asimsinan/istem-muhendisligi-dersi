"""İstem Mühendisliği — Manim ortak stili.

Renkler ve yazı tipleri tasarim/tema.json dosyasından okunur.
Her sahne:  from stil import *   ile başlar ve DersSahnesi sınıfından türetilir.
"""
import json
from pathlib import Path

from manim import (
    Scene, Text, RoundedRectangle, VGroup, config, ManimColor, DOWN, UP, LEFT, RIGHT,
)

_TEMA_YOLU = Path(__file__).resolve().parent.parent / "tasarim" / "tema.json"
TEMA = json.loads(_TEMA_YOLU.read_text(encoding="utf-8"))


def renk(ad: str) -> ManimColor:
    return ManimColor("#" + TEMA["renk"][ad])


KIRMIZI = renk("kirmizi")
KIRMIZI_KOYU = renk("kirmiziKoyu")
KIRMIZI_ACIK = renk("kirmiziAcik")
NOTR_KART = renk("notrKart")
ZEMIN = renk("zemin")
KART = renk("kart")
METIN = renk("metin")
METIN_IKINCIL = renk("metinIkincil")
CIZGI = renk("cizgi")
KARSIT = renk("karsit")
PASIF = renk("pasif")

FONT = TEMA["font"]["govde"]
FONT_KOD = TEMA["font"]["kod"]

# Standart çıktı: 1920x1080, 30 fps, kırık beyaz zemin
config.pixel_width = TEMA["video"]["genislik"]
config.pixel_height = TEMA["video"]["yukseklik"]
config.frame_rate = TEMA["video"]["fps"]
config.background_color = ZEMIN


def yazi(metin: str, boyut: float = 36, renk_=METIN, kalin: bool = False, **kw) -> Text:
    """Tema yazı tipiyle metin. boyut: Manim font_size."""
    return Text(metin, font=FONT, font_size=boyut, color=renk_,
                weight="BOLD" if kalin else "NORMAL", **kw)


def kod(metin: str, boyut: float = 28, renk_=METIN, **kw) -> Text:
    return Text(metin, font=FONT_KOD, font_size=boyut, color=renk_, **kw)


def kart(genislik: float, yukseklik: float, dolgu=KART, kenar=CIZGI,
         kalinlik: float = 2, yaricap: float = 0.18) -> RoundedRectangle:
    return RoundedRectangle(width=genislik, height=yukseklik, corner_radius=yaricap,
                            fill_color=dolgu, fill_opacity=1,
                            stroke_color=kenar, stroke_width=kalinlik)


class DersSahnesi(Scene):
    """Tüm ders animasyonlarının temel sınıfı.

    Kurallar: videoda başlık yazılmaz (başlığı slayt verir); her video anlamlı bir son
    kareyle biter (durdurulunca özet gibi okunur).
    """

    def kunye(self, hafta: int, kod_: str):
        """Sol alt köşede küçük künye: 'H1 · M1.3' — slayt koduyla eşleşir."""
        k = yazi(f"H{hafta} · {kod_}", boyut=18, renk_=PASIF)
        k.to_corner(DOWN + LEFT, buff=0.35)
        self.add(k)
        return k
