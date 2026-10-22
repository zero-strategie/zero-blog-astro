import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { test } from 'node:test';
import { findZeroJsViolations, listDistFiles, readDistHtml } from '../scripts/lib/dist.mjs';

test('aucun HTML de dist/client ne contient de JavaScript', () => {
	const pages = readDistHtml();
	assert.ok(pages.length > 0, 'aucune page HTML trouvée');
	for (const { file, html } of pages) {
		assert.deepEqual(findZeroJsViolations(html), [], file);
	}
});

test('dist/client ne contient aucun fichier .js ni .mjs', () => {
	const scripts = listDistFiles().filter((file) => ['.js', '.mjs'].includes(extname(file)));
	assert.deepEqual(scripts, []);
});

test("using-mdx.mdx ne contient plus d'onclick", () => {
	const source = readFileSync(new URL('../src/content/blog/using-mdx.mdx', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /onclick/i);
});
