import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { test } from 'node:test';
import {
	DIST_DIR,
	findZeroJsViolations,
	listDistFiles,
	readDistHtml,
} from '../scripts/lib/dist.mjs';
import { FIXTURE_ARTICLES } from '../scripts/lib/fixtures.mjs';

test('aucun HTML de dist/client ne contient de JavaScript', () => {
	const pages = readDistHtml();
	assert.ok(pages.length > 0, 'aucune page HTML trouvée');
	for (const { file, html } of pages) {
		assert.deepEqual(findZeroJsViolations(html), [], relative(DIST_DIR, file));
	}
});

test('dist/client ne contient aucun fichier .js ni .mjs', () => {
	const scripts = listDistFiles().filter((file) => ['.js', '.mjs'].includes(extname(file)));
	assert.deepEqual(
		scripts.map((file) => relative(DIST_DIR, file)),
		[],
	);
});

test('le Markdown piégé des fixtures (<script>, javascript:) n’atteint pas la page', () => {
	const trapped = FIXTURE_ARTICLES.filter(({ blocks }) =>
		blocks.some(({ body }) => /<script|javascript:/.test(body ?? '')),
	);
	assert.ok(trapped.length > 0, 'aucun piège dans les fixtures : le test passerait à vide');
	for (const { slug } of trapped) {
		const html = readFileSync(join(DIST_DIR, 'blog', slug, 'index.html'), 'utf8');
		assert.deepEqual(findZeroJsViolations(html), [], slug);
	}
});
