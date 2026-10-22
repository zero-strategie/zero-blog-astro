/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// The astro:env schema is validated when the config loads, so the variable
// must exist in this process — `test.env` would come too late. Forced rather
// than defaulted so a developer's own STRAPI_URL cannot change test results.
process.env.STRAPI_URL = 'http://cms.test';
delete process.env.STRAPI_API_TOKEN;

// getViteConfig loads Astro's Vite plugins, so tests can import the
// `astro:env/server` virtual module and render components with the
// Container API exactly as the build does.
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts'],
	},
});
