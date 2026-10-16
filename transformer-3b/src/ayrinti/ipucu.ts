// TR: Sahnedeki bir hücrenin üstüne gelince gösterilen bilgi kutusu (sahne yazar, sayfa okur)
export interface IIpucu { metin: string; x: number; y: number }
let deger: IIpucu | null = null;
const dinleyiciler = new Set<() => void>();
export const ipucu = {
    abone: (f: () => void) => { dinleyiciler.add(f); return () => { dinleyiciler.delete(f); }; },
    oku: () => deger,
    yaz: (v: IIpucu | null) => { deger = v; dinleyiciler.forEach(f => f()); },
};
