import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const compact = (css) => css.replace(/\s+/g, '');
const tokensCss = compact(readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'));

/** Contenu des blocs `@media print` (accolades équilibrées). */
const printBlocks = (css) => {
	const blocks = [];
	let from = css.indexOf('@mediaprint{');
	while (from !== -1) {
		let depth = 0;
		let cursor = css.indexOf('{', from);
		const start = cursor + 1;
		do {
			depth += css[cursor] === '{' ? 1 : css[cursor] === '}' ? -1 : 0;
			cursor += 1;
		} while (depth > 0);
		blocks.push(css.slice(start, cursor - 1));
		from = css.indexOf('@mediaprint{', cursor);
	}
	return blocks.join('');
};

test('en impression, papier blanc et encre noire via les jetons', () => {
	const print = printBlocks(tokensCss);
	assert.match(print, /--paper:#fff/);
	assert.match(print, /--ink:#000/);
	assert.match(print, /--ink-soft:#000/);
	assert.match(print, /--ink-red-text:#000/);
});

for (const { file, html } of readDistHtml()) {
	const print = printBlocks(compact(pageCss(html)));

	test(`${file} : l’impression masque l’en-tête, la navigation et le lien d’évitement`, () => {
		assert.match(print, /body>header,\.skip-link\{display:none\}/);
	});

	test(`${file} : l’impression retire la trame et garde le pied de page`, () => {
		assert.match(print, /body\{[^}]*background-image:none/);
		assert.doesNotMatch(print, /footer[^{]*\{[^}]*display:none/);
	});

	test(`${file} : l’impression écrit l’URL des liens externes après le texte`, () => {
		assert.match(print, /maina\[href\^=http\]:after\{content:"\("attr\(href\)"\)"/);
	});
}
