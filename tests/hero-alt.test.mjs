import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
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

test('chaque article du jeu d’essai avec heroImage déclare un heroAlt non vide', () => {
	const blogDir = new URL('../src/content/blog/', import.meta.url);
	const frontmatterValue = (frontmatter, key) =>
		frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '');
	for (const name of readdirSync(blogDir)) {
		const frontmatter = readFileSync(new URL(name, blogDir), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
		const heroImage = frontmatterValue(frontmatter, 'heroImage');
		const heroAlt = frontmatterValue(frontmatter, 'heroAlt');
		assert.ok(isHeroAltValid({ heroImage, heroAlt }), name);
	}
});

test('content.config.ts applique cette règle au schéma', () => {
	const config = readFileSync(new URL('../src/content.config.ts', import.meta.url), 'utf8');
	assert.match(config, /\.refine\(isHeroAltValid,/);
});
