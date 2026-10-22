import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SUMMARY_LIMIT, splitFeatured } from '../src/lib/featured.ts';

const post = (id, date) => ({ id, data: { pubDate: new Date(date) } });

test('splitFeatured met le plus récent à la une et trie le sommaire du plus récent au plus ancien', () => {
	const { featured, summary } = splitFeatured([
		post('b', '2024-01-02'),
		post('c', '2025-03-01'),
		post('a', '2023-05-05'),
	]);
	assert.equal(featured?.id, 'c');
	assert.deepEqual(summary.map(({ id }) => id), ['b', 'a']);
});

test("splitFeatured renvoie un état vide sans article", () => {
	assert.deepEqual(splitFeatured([]), { featured: undefined, summary: [] });
});

test('splitFeatured limite le sommaire à 20 articles, sans la une', () => {
	const posts = Array.from({ length: 30 }, (_, i) => post(`p${i}`, Date.UTC(2020, 0, i + 1)));
	const { featured, summary } = splitFeatured(posts);
	assert.equal(SUMMARY_LIMIT, 20);
	assert.equal(featured?.id, 'p29');
	assert.equal(summary.length, 20);
	assert.equal(summary[0].id, 'p28');
});

test('splitFeatured ne modifie pas le tableau reçu', () => {
	const posts = [post('a', '2020-01-01'), post('b', '2021-01-01')];
	splitFeatured(posts);
	assert.deepEqual(posts.map(({ id }) => id), ['a', 'b']);
});
