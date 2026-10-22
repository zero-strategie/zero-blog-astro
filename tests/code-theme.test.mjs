import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { meetsWcag } from '../scripts/lib/contrast.mjs';
import { readDistHtml } from '../scripts/lib/dist.mjs';
import { parseTokens } from '../scripts/lib/tokens.mjs';

const tokens = parseTokens(
	readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
);
const codeBlocks = readDistHtml().flatMap(
	({ html }) => html.match(/<pre class="astro-code[^>]*>[\s\S]*?<\/pre>/g) ?? [],
);
const inlineStyles = (html) => [...html.matchAll(/style="([^"]*)"/g)].map(([, style]) => style);

test('le jeu d’essai contient des blocs de code', () => {
	assert.ok(codeBlocks.length > 0);
});

test('les blocs de code n’ont aucune couleur littérale inline et utilisent --astro-code-*', () => {
	for (const block of codeBlocks) {
		const styles = inlineStyles(block).join(';');
		assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b|rgb|hsl/i);
		assert.match(styles, /var\(--astro-code-/);
		assert.doesNotMatch(block, /github-dark/);
	}
});

const CODE_TOKENS = [
	'--astro-code-foreground',
	'--astro-code-token-constant',
	'--astro-code-token-string',
	'--astro-code-token-comment',
	'--astro-code-token-keyword',
	'--astro-code-token-parameter',
	'--astro-code-token-function',
	'--astro-code-token-string-expression',
	'--astro-code-token-punctuation',
	'--astro-code-token-link',
];

for (const theme of ['light', 'dark']) {
	test(`contraste ${theme} : chaque couleur de code sur --astro-code-background atteint 4,5:1`, () => {
		const resolved = { ...tokens.light, ...tokens[theme] };
		assert.ok(resolved['--astro-code-background'], 'fond manquant');
		for (const name of CODE_TOKENS) {
			assert.ok(resolved[name], `${name} manquant`);
			assert.equal(
				meetsWcag(resolved[name], resolved['--astro-code-background'], 'text'),
				true,
				name,
			);
		}
	});
}
