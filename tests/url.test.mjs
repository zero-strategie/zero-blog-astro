import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES } from '../src/consts.ts';
import { articleUrl, categoryUrl } from '../src/lib/url.ts';

test("articleUrl construit /blog/<id>/", () => {
	assert.equal(articleUrl('first-post'), '/blog/first-post/');
});

test('categoryUrl construit /rubriques/<slug>/', () => {
	assert.equal(categoryUrl('ia'), '/rubriques/ia/');
});

test('CATEGORIES liste les 5 rubriques numérotées dans l\'ordre', () => {
	assert.deepEqual(
		CATEGORIES.map(({ slug, number, label }) => [slug, number, label]),
		[
			['projets', '01', 'Projets'],
			['open-source', '02', 'Open source'],
			['ia', '03', 'IA'],
			['souverainete', '04', 'Souveraineté'],
			['politique', '05', 'Politique'],
		],
	);
});
