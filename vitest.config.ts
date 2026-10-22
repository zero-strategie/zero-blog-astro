/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig loads Astro's Vite plugins, so tests can import the
// `astro:env/server` virtual module and render components with the
// Container API exactly as the build does.
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts'],
		env: {
			STRAPI_URL: 'http://cms.test',
		},
	},
});
