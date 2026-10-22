// @ts-check

import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// The astro:env schema below is what validates STRAPI_URL; it is read here
// too, only to let astro:assets download and optimise the CMS uploads at
// build time. The built pages then serve /_astro/… copies and never point at
// the CMS origin, which may be internal to the build network.
const STRAPI_URL =
	process.env.STRAPI_URL ?? (existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')).STRAPI_URL : undefined);
const cmsImages = (() => {
	try {
		const { protocol, hostname, port } = new URL(STRAPI_URL ?? '');
		return [{ protocol: protocol.replace(':', ''), hostname, port, pathname: '/uploads/**' }];
	} catch {
		return [];
	}
})();

// https://astro.build/config
export default defineConfig({
	// Feeds canonical URLs, @astrojs/sitemap and @astrojs/rss. Every one of
	// them is wrong while this is a placeholder.
	site: 'https://zero-strategie.dev',

	// output stays 'static' (the default): pages are prerendered and only the
	// routes that opt out with `export const prerender = false` are rendered
	// per request. The adapter is what makes that opt-out possible at all —
	// see AGENTS.md 4.1. Standalone mode ships its own HTTP server, which is
	// what the container runs.
	adapter: node({ mode: 'standalone' }),

	env: {
		schema: {
			STRAPI_URL: envField.string({ context: 'server', access: 'public' }),
			// Read-only token. `secret` keeps it out of any client bundle.
			STRAPI_API_TOKEN: envField.string({
				context: 'server',
				access: 'secret',
				optional: true,
			}),
		},
	},

	image: { remotePatterns: cmsImages },

	// Le contenu vient de Strapi et passe par src/lib/markdown.mjs (assainissement,
	// appels de note, notes en marge, coloration css-variables) : aucun Markdown
	// local, donc ni `markdown` ni MDX ici.
	integrations: [sitemap()],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Fraunces',
			cssVariable: '--font-fraunces',
			fallbacks: [],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/fraunces.woff2'],
						weight: '400 900',
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
