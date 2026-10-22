import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SUMMARY_LIMIT, splitFeatured } from '../src/lib/featured.mjs';

const post = (id, isoDate) => ({ id, publishedAt: new Date(isoDate) });
const postsOnConsecutiveDays = (count) =>
	Array.from({ length: count }, (_, index) => post(`p${index}`, Date.UTC(2026, 0, 1 + index)));

test('la limite du sommaire est de 20 articles', () => {
	assert.equal(SUMMARY_LIMIT, 20);
});

test('la une est le plus récent, le sommaire reprend les suivants du plus récent au plus ancien', () => {
	const { featured, summary } = splitFeatured([
		post('ancien', '2026-01-01'),
		post('récent', '2026-03-01'),
		post('milieu', '2026-02-01'),
	]);
	assert.equal(featured?.id, 'récent');
	assert.deepEqual(
		summary.map(({ id }) => id),
		['milieu', 'ancien'],
	);
});

test('le sommaire est tronqué à 20 articles, sans compter la une', () => {
	const { featured, summary } = splitFeatured(postsOnConsecutiveDays(25));
	assert.equal(featured?.id, 'p24');
	assert.equal(summary.length, SUMMARY_LIMIT);
	assert.equal(summary[0].id, 'p23');
});

test('une liste vide donne une une absente et un sommaire vide', () => {
	assert.deepEqual(splitFeatured([]), { featured: undefined, summary: [] });
});

test('un seul article est à la une, le sommaire est vide', () => {
	const { featured, summary } = splitFeatured([post('seul', '2026-01-01')]);
	assert.equal(featured?.id, 'seul');
	assert.deepEqual(summary, []);
});

test("le tableau d'entrée n'est pas muté", () => {
	const input = [post('a', '2026-01-01'), post('b', '2026-03-01'), post('c', '2026-02-01')];
	const before = [...input];
	splitFeatured(input);
	assert.deepEqual(input, before);
});
