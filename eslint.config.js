// @ts-check
import eslintPluginAstro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{ ignores: ['dist/', '.astro/', 'node_modules/'] },
	tseslint.configs.recommended,
	eslintPluginAstro.configs.recommended,
	{
		rules: {
			// AGENTS.md 4.8: the repository keeps zero occurrences of `any`.
			'@typescript-eslint/no-explicit-any': 'error',
			// `const { html, ...rest } = page` is how main omits a key (weight.mjs, rehype-sidenotes.mjs).
			'@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
		},
	},
);
