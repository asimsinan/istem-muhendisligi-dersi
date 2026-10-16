// TR: Site /transformer-3b/ altında yayımlanır (next.config.js basePath). Statik dosya yolları buna göre kurulur.
export const TABAN = process.env.NEXT_PUBLIC_TABAN ?? '/transformer-3b';
export const yol = (p: string) => TABAN + p;
