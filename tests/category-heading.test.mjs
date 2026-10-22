import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('consts.ts expose CATEGORY_BY_SLUG et categoryHeading', () => {
	const consts = source('consts.ts');
	assert.match(consts, /export const CATEGORY_BY_SLUG\b/);
	assert.match(consts, /export const categoryHeading\b/);
});

test('le format « §0N Libellé » est écrit une seule fois, dans consts.ts', () => {
	assert.match(source('consts.ts'), /§\$\{/);
	for (const path of ['components/Stamp.astro', 'pages/rubriques/[slug].astro']) {
		const file = source(path);
		assert.match(file, /categoryHeading\(/, path);
		assert.doesNotMatch(file, /§/, path);
		assert.doesNotMatch(file, /\)!|\w!\.|\w!;/, `${path} : assertion non nulle`);
	}
});
