/** @type {import('next').NextConfig} */
// TR: 3B görünüm, ders sitesinde /transformer-3b/ altında statik olarak yayımlanır.
// İngilizce sürüm: NEXT_PUBLIC_DIL=en NEXT_PUBLIC_TABAN=/transformer-3b/en npx next build (çıktı /transformer-3b/en/ altına)
const TABAN = process.env.NEXT_PUBLIC_TABAN ?? '/transformer-3b';

const nextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  output: 'export',
  basePath: TABAN,
  trailingSlash: true,
  agentRules: false,
  env: { NEXT_PUBLIC_TABAN: TABAN, NEXT_PUBLIC_DIL: process.env.NEXT_PUBLIC_DIL ?? 'tr' },
};

module.exports = nextConfig;
