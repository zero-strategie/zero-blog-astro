import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';
import { MANIFESTO } from '../src/consts.ts';

const home = (readDistHtml().find(({ file }) => file.endsWith('/client/index.html'))?.html ?? '').replaceAll('&#39;', "'");
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const section = (className) =>
	home.match(new RegExp(`<(\\w+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`))?.[2] ?? '';
const rows = () => [...home.matchAll(/<li\b[^>]*class="[^"]*\barticle-row\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(([, inner]) => inner);
const datetimeOf = (html) => html.match(/<time\b[^>]*datetime="([^"]+)"/)?.[1];

test("l'accueil affiche le manifeste et aucun reste du starter", () => {
	assert.ok(home.length > 0);
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
		assert.match(row, /<h2\b[^>]*>\s*<a\b[^>]*href="\/blog\/[^"]+\/"/);
	}
});

test('la couverture à la une est prioritaire, responsive et décrite par heroAlt', () => {
	const cover = section('featured').match(/<img\b[^>]*>/)?.[0] ?? '';
	assert.match(attr(cover, 'alt') ?? '', /^Illustration provisoire/);
	assert.equal(attr(cover, 'loading'), 'eager');
	assert.equal(attr(cover, 'fetchpriority'), 'high');
	assert.ok(attr(cover, 'srcset'));
	assert.ok(attr(cover, 'sizes'));
});

test('la CSS applique la bichromie sur un aplat rouge défini par token', () => {
	const css = pageCss(home).replace(/\s+/g, ' ');
	assert.match(css, /grayscale\(/);
	assert.match(css, /mix-blend-mode:\s*multiply/);
	assert.match(css, /background:\s*var\(--ink-red\)/);
});
