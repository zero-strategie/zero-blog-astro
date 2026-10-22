import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveMediaUrl } from '../src/lib/media-url.mjs';

test('préfixe un chemin d’upload relatif par l’origine du CMS', () => {
	assert.equal(resolveMediaUrl('/uploads/a.jpg', 'http://localhost:1337'), 'http://localhost:1337/uploads/a.jpg');
});

test('tolère une barre finale sur l’origine', () => {
	assert.equal(resolveMediaUrl('/uploads/a.jpg', 'http://localhost:1337/'), 'http://localhost:1337/uploads/a.jpg');
});

test('laisse intacte une URL absolue (stockage objet)', () => {
	assert.equal(resolveMediaUrl('https://cdn.example.org/a.jpg', 'http://localhost:1337'), 'https://cdn.example.org/a.jpg');
});
