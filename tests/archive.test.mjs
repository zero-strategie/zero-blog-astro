import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readDistHtml } from '../scripts/lib/dist.mjs';

const archive = readDistHtml().find(({ file }) => file.endsWith('/client/blog/index.html'))?.html ?? '';
const main = archive.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const rows = () => [...main.matchAll(/<li\b[^>]*class="[^"]*\barticle-row\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(([, inner]) => inner);
const datetimeOf = (html) => html.match(/<time\b[^>]*datetime="([^"]+)"/)?.[1];

test("l'archive liste les 5 articles du plus récent au plus ancien", () => {
	const dates = rows().map(datetimeOf);
	assert.equal(dates.length, 5);
	assert.deepEqual(dates, [...dates].sort().reverse());
});

test('chaque ligne a un time en français, un tampon et un titre lié', () => {
	assert.ok(rows().length > 0);
	for (const row of rows()) {
		assert.match(row, /<time\b[^>]*>\s*\d{1,2}(er)? [a-zéû]+ \d{4}\s*<\/time>/);
		assert.match(row, /<a\b[^>]*class="[^"]*\bstamp\b/);
		assert.match(row, /<h2\b[^>]*>\s*<a\b[^>]*href="\/blog\/[^"]+\/"/);
	}
});

test('le title et le H1 sont « Archive »', () => {
	assert.match(archive, /<title>Archive — zero-stratégie<\/title>/);
	assert.match(main, /<h1\b[^>]*>\s*Archive\s*<\/h1>/);
});

test("l'archive n'a ni image sans alt ni largeur en px codée en dur", () => {
	const source = readFileSync(new URL('../src/pages/blog/index.astro', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /(?:min-|max-)?width\s*:[^;]*\d\s*px/);
	assert.doesNotMatch(main, /<img\b(?![^>]*\balt=)/);
});

test("l'état vide de l'archive vient de consts.ts", () => {
	const source = readFileSync(new URL('../src/pages/blog/index.astro', import.meta.url), 'utf8');
	assert.match(source, /EMPTY_ARCHIVE_MESSAGE/);
	assert.match(readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8'), /export const EMPTY_ARCHIVE_MESSAGE/);
});
