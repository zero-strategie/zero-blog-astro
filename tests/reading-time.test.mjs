import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readingTime } from '../src/lib/reading-time.mjs';

const words = (count) => Array.from({ length: count }, () => 'mot').join(' ');

test('un texte vide se lit en 1 minute', () => {
	assert.equal(readingTime(''), 1);
});

test('220 mots se lisent en 1 minute, 221 mots en 2', () => {
	assert.equal(readingTime(words(220)), 1);
	assert.equal(readingTime(words(221)), 2);
});

test('le code délimité est ignoré', () => {
	const source = `${words(10)}\n\n\`\`\`js\n${words(500)}\n\`\`\`\n\n~~~\n${words(500)}\n~~~\n`;
	assert.equal(readingTime(source), 1);
});
