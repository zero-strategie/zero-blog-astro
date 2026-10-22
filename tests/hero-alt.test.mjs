import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FIXTURE_ARTICLES } from '../scripts/lib/fixtures.mjs';
import { isHeroAltValid } from '../src/lib/hero-alt.mjs';

const IMAGE = { src: '/cover.jpg' };

test('sans heroImage, heroAlt est facultatif', () => {
	assert.equal(isHeroAltValid({}), true);
	assert.equal(isHeroAltValid({ heroAlt: 'Une couverture' }), true);
});

test('avec heroImage, un heroAlt renseigné est accepté', () => {
	assert.equal(isHeroAltValid({ heroImage: IMAGE, heroAlt: 'Une couverture' }), true);
});

test('avec heroImage, un heroAlt manquant est refusé', () => {
	assert.equal(isHeroAltValid({ heroImage: IMAGE }), false);
	assert.equal(isHeroAltValid({ heroImage: IMAGE, heroAlt: undefined }), false);
});

test('avec heroImage, un heroAlt vide ou blanc est refusé', () => {
	assert.equal(isHeroAltValid({ heroImage: IMAGE, heroAlt: '' }), false);
	assert.equal(isHeroAltValid({ heroImage: IMAGE, heroAlt: '   ' }), false);
});

test('chaque article des fixtures avec couverture a un texte alternatif non vide', () => {
	assert.ok(
		FIXTURE_ARTICLES.some(({ cover }) => cover),
		'aucune couverture : le test passerait à vide',
	);
	for (const { slug, cover } of FIXTURE_ARTICLES) {
		assert.ok(
			isHeroAltValid({
				heroImage: cover ?? undefined,
				heroAlt: cover?.alternativeText ?? undefined,
			}),
			slug,
		);
	}
});

test('le mapper Strapi applique cette règle à la couverture', () => {
	const mapper = readFileSync(new URL('../src/lib/mappers/article.ts', import.meta.url), 'utf8');
	assert.match(mapper, /isHeroAltValid\(\{ heroImage: cover, heroAlt: cover\?\.alt \}\)/);
});
