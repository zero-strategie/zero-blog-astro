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

test('les notes en marge sont masquées sur mobile et flottent à droite à partir de 85rem', () => {
	assert.match(css, /\.sidenote[^{}]*\{[^}]*display: ?none/);
	const desktop = css.match(/@media ?\(min-width: ?85rem\) ?\{(.*)/)?.[1] ?? '';
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*float: ?right/);
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*clear: ?right/);
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*margin-right: ?calc\(-/);
	assert.doesNotMatch(desktop, /\.sidenote[^{}]*\{[^}]*position: ?absolute/);
});

test('tout lien de la copie en marge est retiré de l\'ordre de tabulation', () => {
	const sidenote = html.match(/<span class="sidenote"[^>]*>(.*?)<\/span><\/cite>/s)?.[1] ?? '';
	const links = sidenote.match(/<a [^>]*>/g) ?? [];
	assert.ok(links.length > 0);
	for (const link of links) assert.match(link, /tabindex="-1"/);
});

test('deux notes empilées en marge sont espacées', () => {
	const desktop = css.match(/@media ?\(min-width: ?85rem\) ?\{(.*)/)?.[1] ?? '';
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*margin-bottom: ?\.75rem/);
});

test('les notes de fin ne sont jamais masquées et les copies en marge sont aria-hidden', () => {
	assert.doesNotMatch(css, /\[data-footnotes\][^{}]*\{[^}]*display: ?none/);
	assert.match(html, /<span class="sidenote" aria-hidden="true">/);
});

test('le titre « Notes » est visible, en monospace capitales avec un filet', () => {
	assert.doesNotMatch(html, /<h2[^>]*class="sr-only"[^>]*>Notes/);
	const rule = css.match(/\[data-footnotes\] h2[^{}]*\{[^}]*\}/)?.[0] ?? '';
	assert.match(rule, /font-family: ?var\(--font-mono\)/);
	assert.match(rule, /text-transform: ?uppercase/);
	assert.match(rule, /border-(top|bottom)[^;]*var\(--/);
});

test('les notes sont en monospace petit corps, numéro rouge texte, filet fin, via les tokens', () => {
	const rule = css.match(/\.sidenote[^{}]*\{[^}]*font-family: ?var\(--font-mono\)[^}]*\}/)?.[0] ?? '';
	assert.match(rule, /font-size: ?0?\.\d+rem/);
	assert.match(rule, /border-(left|top)[^;]*var\(--/);
	assert.match(css, /\.sidenote-number[^{}]*\{[^}]*color: ?var\(--ink-red-text\)/);
});
