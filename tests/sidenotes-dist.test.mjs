import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';
import { fixtureArticle } from '../scripts/lib/fixtures.mjs';

const pages = readDistHtml();
const pageOf = (slug) => {
	const page = pages.find(({ file }) => file.endsWith(`blog/${slug}/index.html`));
	assert.ok(page, slug);
	return page.html;
};
// Une note de bas de page GFM [^1] et une source citée : les deux mécanismes de notes en marge.
const html = pageOf('cables-sous-marins-routes-internet');
const css = pageCss(html).replace(/\s+/g, ' ');
const SIDENOTE = /<span class="sidenote" aria-hidden="true"><span class="sidenote-number">(\d+)<\/span>([\s\S]*?)<\/span>/g;
const sidenotesOf = (page) => [...page.matchAll(SIDENOTE)].map(([, number, body]) => ({ number, body }));

test('la note GFM [^1] de l’article câbles a sa copie en marge, avec son contenu et son lien', () => {
	const sidenote = sidenotesOf(html).find(({ body }) => /licence libre/.test(body))?.body ?? '';
	assert.match(sidenote, /<a href="https:\/\/github\.com\/telegeography\/www\.submarinecablemap\.com"/);
	assert.doesNotMatch(sidenote, /data-footnote-backref/);
});

test('chaque source citée a une seule copie en marge, après son premier appel', () => {
	const slug = 'cloud-act-donnees-europeennes';
	const page = pageOf(slug);
	const { sources } = fixtureArticle(slug);
	const notes = sidenotesOf(page);
	assert.deepEqual(notes.map(({ number }) => number), sources.map((_, index) => String(index + 1)));
	sources.forEach((source, index) => {
		assert.ok(notes[index].body.includes(`<a href="${source.url}" tabindex="-1">`), source.url);
		const firstCall = page.indexOf(`href="#source-${index + 1}"`);
		assert.ok(firstCall > -1 && firstCall < page.indexOf(notes[index].body), `appel ${index + 1}`);
	});
});

test('chaque appel de note vise une source numérotée présente en fin d’article', () => {
	const page = pageOf('cloud-act-donnees-europeennes');
	const calls = [...page.matchAll(/<sup class="citation"><a href="#(source-\d+)"/g)].map(([, id]) => id);
	assert.ok(calls.length > 0);
	for (const id of new Set(calls)) assert.match(page, new RegExp(`<li id="${id}"`), id);
});

test('la section de notes de fin est intitulée « Notes » et ses liens retour sont en français', () => {
	assert.match(html, /<section data-footnotes[^>]*>\s*<h2[^>]*>Notes<\/h2>/);
	assert.match(html, /data-footnote-backref[^>]*aria-label="Retour au texte"|aria-label="Retour au texte"[^>]*data-footnote-backref/);
	assert.doesNotMatch(html, /Back to reference|Footnotes</);
});

test("les identifiants restent uniques malgré la copie des notes", () => {
	for (const page of [html, pageOf('cloud-act-donnees-europeennes')]) {
		const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
		assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
	}
});

test('les notes en marge sont masquées sur mobile et flottent à droite à partir de 85rem', () => {
	assert.match(css, /\.sidenote[^{}]*\{[^}]*display: ?none/);
	const desktop = css.match(/@media ?\(min-width: ?85rem\) ?\{(.*)/)?.[1] ?? '';
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*float: ?right/);
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*clear: ?right/);
	assert.match(desktop, /\.sidenote[^{}]*\{[^}]*margin-right: ?calc\(-/);
	assert.doesNotMatch(desktop, /\.sidenote[^{}]*\{[^}]*position: ?absolute/);
});

test('tout lien d\'une copie en marge est retiré de l\'ordre de tabulation', () => {
	const links = sidenotesOf(html).flatMap(({ body }) => body.match(/<a [^>]*>/g) ?? []);
	assert.ok(links.length >= 2);
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
