// @ts-check

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { defineConfig, envField, fontProviders } from 'astro/config';
import rehypeSidenotes from './src/lib/rehype-sidenotes.mjs';

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

	// Notes `[^1]` : copiées en marge (desktop) par rehypeSidenotes, section de fin conservée (mobile).
	markdown: {
		rehypePlugins: [rehypeSidenotes],
		// Couleurs de syntaxe via --astro-code-* (tokens.css) : aucune couleur inline, thème clair/sombre natif.
		shikiConfig: { theme: 'css-variables' },
		remarkRehype: {
			footnoteLabel: 'Notes',
			footnoteBackLabel: 'Retour au texte',
			// Par défaut le titre est sr-only ; on le veut visible.
			footnoteLabelProperties: {},
		},
	},

	integrations: [mdx(), sitemap()],
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
