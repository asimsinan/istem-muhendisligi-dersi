import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// TR: İngilizce derleme (VITE_DIL=en). Arayüz yazıları kaynakta Türkçe; bu eklenti derleme sırasında
// src/dil/en.json'daki [Türkçe, İngilizce] çiftlerini dosya dosya değiştirir ve ders kitabı sayfalarını
// src/dil/sayfalar_en.json'dan alır. Bir çift bulunamazsa (kaynak değişmişse) derleme hata verir; böylece
// çeviri sessizce eskimez.
function ceviriEN(): Plugin {
	if (process.env.VITE_DIL !== 'en') return { name: 'ceviri-yok' };
	const kok = path.resolve('src');
	const tablo: Record<string, [string, string][]> = JSON.parse(fs.readFileSync('src/dil/en.json', 'utf8'));
	const sayfalar = JSON.parse(fs.readFileSync('src/dil/sayfalar_en.json', 'utf8'));
	const eksik: string[] = [];
	const gorulen = new Set<string>();
	return {
		name: 'ceviri-en',
		enforce: 'pre',
		transform(kod, id) {
			if (id.includes('?') || !id.startsWith(kok)) return null;
			const rel = path.relative(kok, id).replace(/\\/g, '/');
			let c = kod;
			const ciftler = tablo[rel];
			if (ciftler) {
				gorulen.add(rel);
				for (const [tr, en] of ciftler) {
					if (!c.includes(tr)) eksik.push(`${rel}: ${tr.slice(0, 70)}`);
					c = c.split(tr).join(en);
				}
			}
			if (rel === 'utils/textbookPages.ts') {
				c += `\n;(function (s) { for (const p of textPages) { const e = s[p.id]; if (e) { p.title = e.title; if (e.content) p.content = e.content; } } })(${JSON.stringify(sayfalar)});\n`;
			}
			return c === kod ? null : { code: c, map: null };
		},
		buildEnd() {
			const hic = Object.keys(tablo).filter((d) => !d.startsWith('@') && !gorulen.has(d)); // '@app.html': derlemeden sonra (scripts-tr/derle_en.sh)
			if (hic.length) this.warn('Derlemeye girmeyen (kullanılmayan) dosyalar: ' + hic.join(', '));
			if (eksik.length) this.error('Çevrilemeyen yazılar:\n' + eksik.join('\n'));
		}
	};
}

export default defineConfig({
	plugins: [ceviriEN(), sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@import 'src/styles/variables.scss';`,
				loadPaths: [process.cwd()], // TR: Vite 6 / modern Sass için
				silenceDeprecations: ['import', 'global-builtin', 'legacy-js-api']
			}
		}
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	}
});
