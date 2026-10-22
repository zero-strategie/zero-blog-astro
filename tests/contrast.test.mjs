import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrastRatio, meetsWcag } from '../scripts/lib/contrast.mjs';

test('noir sur blanc vaut 21:1', () => {
	assert.equal(contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
});

test('le rouge riso sur le papier échoue en texte courant', () => {
	assert.equal(meetsWcag('#e3412b', '#f3eee3', 'text'), false);
});

test('le rouge riso sur le papier passe en grand texte et composant graphique', () => {
	assert.equal(meetsWcag('#e3412b', '#f3eee3', 'large'), true);
});
