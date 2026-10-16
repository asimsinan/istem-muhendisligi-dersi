// GPT-2 türü bayt düzeyinde BPE tokenizer (Hugging Face tokenizer.json'dan).
// Türkçe GPT-2 (ytu-ce-cosmos/turkish-gpt2) için; sonuçlar Python `tokenizers` ile birebir karşılaştırıldı.

export interface Parca {
  id: number;
  metin: string; // insan okunur hâli (tamamlanmamış UTF-8 baytları "�")
}

// GPT-2 ön bölme kuralı: kelimeler, sayılar, noktalama ve boşluklar ayrı gruplara
const ON_BOLME = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

function baytHaritasi(): Map<number, string> {
  const bs: number[] = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }
  const m = new Map<number, string>();
  bs.forEach((b, i) => m.set(b, String.fromCharCode(cs[i])));
  return m;
}

export class BaytBPE {
  private sozluk: Map<string, number>;
  private sira: Map<string, number>;
  private bayt2kar = baytHaritasi();
  private kar2bayt: Map<string, number>;
  private onbellek = new Map<string, string[]>();
  private cozucu = new TextDecoder("utf-8", { fatal: false });

  constructor(vocab: Record<string, number>, merges: (string | [string, string])[]) {
    this.sozluk = new Map(Object.entries(vocab));
    this.sira = new Map(merges.map((m, i) => [Array.isArray(m) ? m.join(" ") : m, i]));
    this.kar2bayt = new Map([...this.bayt2kar].map(([b, c]) => [c, b]));
  }

  static async yukle(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Tokenizer indirilemedi (${r.status})`);
    const j = await r.json();
    return new BaytBPE(j.model.vocab, j.model.merges);
  }

  private tersSozluk: string[] | null = null;

  // TR (3B): numaralardan metne
  coz(ids: number[]): string {
    if (!this.tersSozluk) {
      this.tersSozluk = [];
      for (const [t, i] of this.sozluk) this.tersSozluk[i] = t;
    }
    const baytlar: number[] = [];
    for (const id of ids) for (const c of this.tersSozluk[id] ?? "") baytlar.push(this.kar2bayt.get(c) ?? 63);
    return this.cozucu.decode(Uint8Array.from(baytlar));
  }

  get sozlukBoyutu() {
    return this.sozluk.size;
  }

  private bpe(kelime: string): string[] {
    const hazir = this.onbellek.get(kelime);
    if (hazir) return hazir;
    let parcalar = [...kelime];
    while (parcalar.length > 1) {
      let enIyi = -1;
      let enIyiSira = Infinity;
      for (let i = 0; i < parcalar.length - 1; i++) {
        const s = this.sira.get(parcalar[i] + " " + parcalar[i + 1]);
        if (s !== undefined && s < enIyiSira) {
          enIyiSira = s;
          enIyi = i;
        }
      }
      if (enIyi < 0) break;
      const a = parcalar[enIyi];
      const b = parcalar[enIyi + 1];
      const yeni: string[] = [];
      for (let i = 0; i < parcalar.length; i++) {
        if (i < parcalar.length - 1 && parcalar[i] === a && parcalar[i + 1] === b) {
          yeni.push(a + b);
          i++;
        } else yeni.push(parcalar[i]);
      }
      parcalar = yeni;
    }
    this.onbellek.set(kelime, parcalar);
    return parcalar;
  }

  private okunur(token: string): string {
    const baytlar = Uint8Array.from([...token].map((c) => this.kar2bayt.get(c) ?? 63));
    return this.cozucu.decode(baytlar);
  }

  kodla(metin: string): Parca[] {
    const sonuc: Parca[] = [];
    const kodlayici = new TextEncoder();
    for (const m of metin.matchAll(ON_BOLME)) {
      const kelime = [...kodlayici.encode(m[0])].map((b) => this.bayt2kar.get(b)!).join("");
      for (const t of this.bpe(kelime)) {
        const id = this.sozluk.get(t);
        if (id === undefined) continue;
        sonuc.push({ id, metin: this.okunur(t) });
      }
    }
    return sonuc;
  }
}
