import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

// Lecture texte de consts.ts : un test ne doit pas importer de .ts (Node < 22.18).
const consts = readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8');
const manifestoBlock = consts.match(/export const MANIFESTO = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
const MANIFESTO = {
	title: manifestoBlock.match(/title: '([^']+)'/)?.[1] ?? '',
	paragraphs: [...(manifestoBlock.match(/paragraphs: \[([\s\S]*?)\],/)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map(([, text]) => text),
};

const home = (readDistHtml().find(({ file }) => file.endsWith('/client/index.html'))?.html ?? '').replaceAll('&#39;', "'");
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const section = (className) =>
	home.match(new RegExp(`<(\\w+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`))?.[2] ?? '';
const rows = () => [...home.matchAll(/<li\b[^>]*class="[^"]*\barticle-row\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(([, inner]) => inner);
const datetimeOf = (html) => html.match(/<time\b[^>]*datetime="([^"]+)"/)?.[1];

test("l'accueil affiche le manifeste et aucun reste du starter", () => {
	assert.ok(home.length > 0);
	assert.ok(MANIFESTO.title && MANIFESTO.paragraphs.length > 0, 'manifeste introuvable dans consts.ts');
	for (const paragraph of MANIFESTO.paragraphs) assert.ok(home.includes(paragraph), paragraph);
	assert.ok(home.includes(MANIFESTO.title));
	assert.doesNotMatch(home, /Hello, Astronaut|Lorem/);
});

test("la une est l'article le plus récent, le sommaire est trié sans elle", () => {
	const featured = section('featured');
	const dates = rows().map(datetimeOf);
	assert.equal(rows().length, 4);
	assert.ok(datetimeOf(featured));
	for (const date of dates) assert.ok(datetimeOf(featured) >= date);
	assert.deepEqual(dates, [...dates].sort().reverse());
	assert.match(featured, /href="\/blog\/markdown-style-guide\/"/);
	assert.doesNotMatch(rows().join(''), /markdown-style-guide/);
});

test('chaque ligne du sommaire a un time, un tampon et un titre lié', () => {
	assert.ok(rows().length > 0);
	for (const row of rows()) {
		assert.match(row, /<time\b/);
		assert.match(row, /<a\b[^>]*class="[^"]*\bstamp\b/);
		assert.match(row, /<h3\b[^>]*>\s*<a\b[^>]*href="\/blog\/[^"]+\/"/);
	}
});

test('les titres du sommaire sont des h3 sous le h2 « Sommaire »', () => {
	assert.match(home, /<h2\b[^>]*>\s*Sommaire\s*<\/h2>/);
	assert.doesNotMatch(rows().join(''), /<h2\b/);
});

test('les colonnes des lignes ont des largeurs fixes pour aligner les titres', () => {
	const css = pageCss(home).replace(/\s+/g, '');
	const desktopColumns = css.match(/@media\(min-width:48rem\)\{\.article-row[^{]*\{[^}]*grid-template-columns:([^;}]+)/)?.[1] ?? '';
	assert.ok(desktopColumns, 'colonnes desktop introuvables');
	assert.doesNotMatch(desktopColumns, /auto/);
});

test('la couverture à la une est prioritaire et responsive', () => {
	const cover = section('featured').match(/<img\b[^>]*>/)?.[0] ?? '';
	assert.equal(attr(cover, 'loading'), 'eager');
	assert.equal(attr(cover, 'fetchpriority'), 'high');
	assert.ok(attr(cover, 'srcset'));
	assert.ok(attr(cover, 'sizes'));
});

test('le lien de couverture masqué a une image décorative (alt vide), sans doublon de lien lu', () => {
	const link = section('featured').match(/<a\b[^>]*class="[^"]*\bcover\b[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
	assert.match(link, /aria-hidden="true"/);
	assert.match(link, /tabindex="-1"/);
	// Astro sérialise alt="" en attribut nu `alt`.
	assert.match(link.match(/<img\b[^>]*>/)?.[0] ?? '', /\salt(?:="")?(?=\s|\/?>)/);
});

test('la CSS applique la bichromie sur un aplat rouge défini par token', () => {
	const css = pageCss(home).replace(/\s+/g, ' ');
	assert.match(css, /grayscale\(/);
	assert.match(css, /mix-blend-mode:\s*multiply/);
	assert.match(css, /background:\s*var\(--ink-red\)/);
});
