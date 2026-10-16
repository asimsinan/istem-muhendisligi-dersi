// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null,
			precompress: false,
			strict: false // Ignore errors about dynamic routes
		}),
		prerender: {
			// List the specific routes to prerender
			entries: ['/' /* other routes if needed */]
		},
		alias: {
			'~': './src',
			// TR: hazır örnek çıktılar (model inmeden gösterilir): İngilizce derlemede OpenAI GPT-2'ninkiler
			$ornekler: process.env.VITE_DIL === 'en' ? './src/constants/examples-en' : './src/constants/examples'
		},
		paths: {
			// TR: İngilizce sürüm /transformer/en/ altında (VITE_DIL=en)
			base: process.env.NODE_ENV === 'production' ? (process.env.VITE_DIL === 'en' ? '/transformer/en' : '/transformer') : ''
		}
	}
};

export default config;
