import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseTokens } from '../scripts/lib/tokens.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const { light } = parseTokens(read('../src/styles/tokens.css'));
const svg = read('../scripts/og-default.svg');
const svgColors = (attribute) =>
	[...svg.matchAll(new RegExp(`${attribute}="(#[0-9a-fA-F]{6})"`, 'g'))].map(([, hex]) => hex);

test("la source de l'image de partage n'utilise que des couleurs de jetons clairs", () => {
	const tokenColors = new Set(Object.values(light));
	const used = [...svgColors('fill'), ...svgColors('stroke')];
	assert.ok(used.length > 0);
	for (const color of used) assert.ok(tokenColors.has(color), `${color} n'est pas un jeton`);
});

test('le sous-titre est en --ink-soft et le titre en --ink', () => {
	assert.ok(svgColors('fill').includes(light['--ink-soft']));
	assert.ok(svgColors('fill').includes(light['--ink']));
});

test("le texte est vectorisé : pas de <text> ni de fonte système dans la source de l'image", () => {
	assert.doesNotMatch(svg, /<text|font-family/);
});
