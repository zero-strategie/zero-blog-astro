import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const page = readDistHtml().find(({ file }) => file.endsWith('blog/markdown-style-guide/index.html'));
assert.ok(page);
const { html } = page;
const css = pageCss(html).replace(/\s+/g, ' ');

test('markdown-style-guide contient une note en marge « Rob Pike » avec son contenu et son lien', () => {
	const sidenote = html.match(/<span class="sidenote"[^>]*>(.*?)<\/span><\/cite>/s)?.[1] ?? '';
	assert.match(sidenote, /Rob Pike/);
	assert.match(sidenote, /<a href="https:\/\/www\.youtube\.com\/watch\?v=PAAkCSZUG1c"/);
	assert.doesNotMatch(sidenote, /data-footnote-backref/);
});

test('la section de notes de fin est intitulée « Notes » et ses liens retour sont en français', () => {
	assert.match(html, /<section data-footnotes[^>]*>\s*<h2[^>]*>Notes<\/h2>/);
	assert.match(html, /data-footnote-backref[^>]*aria-label="Retour au texte"|aria-label="Retour au texte"[^>]*data-footnote-backref/);
	assert.doesNotMatch(html, /Back to reference|Footnotes</);
});

test("les identifiants restent uniques malgré la copie de la note", () => {
	const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
	assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
});

test('la CSS masque les notes en marge sur mobile et les notes de fin en desktop', () => {
	assert.match(css, /\.sidenote[^{}]*\{[^}]*display: ?none/);
	assert.match(css, /@media ?\(min-width: ?[^)]+\) ?\{[^@]*\[data-footnotes\][^{}]*\{[^}]*display: ?none/);
});

test('les notes sont en monospace petit corps, numéro rouge texte, filet fin, via les tokens', () => {
	const rule = css.match(/\.sidenote[^{}]*\{[^}]*font-family: ?var\(--font-mono\)[^}]*\}/)?.[0] ?? '';
	assert.match(rule, /font-size: ?0?\.\d+rem/);
	assert.match(rule, /border-(left|top)[^;]*var\(--/);
	assert.match(css, /\.sidenote-number[^{}]*\{[^}]*color: ?var\(--ink-red-text\)/);
});
