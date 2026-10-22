import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { meetsWcag } from '../scripts/lib/contrast.mjs';
import { parseTokens } from '../scripts/lib/tokens.mjs';

const tokens = parseTokens(
	readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
);

test('tokens.css déclare la palette claire', () => {
	assert.equal(tokens.light['--paper'], '#f3eee3');
	assert.equal(tokens.light['--ink'], '#17161a');
	assert.equal(tokens.light['--ink-red'], '#e3412b');
	assert.equal(tokens.light['--ink-red-text'], '#c0341f');
});

test('tokens.css déclare la palette sombre', () => {
	assert.equal(tokens.dark['--paper'], '#131210');
	assert.equal(tokens.dark['--ink'], '#ebe5d7');
	assert.equal(tokens.dark['--ink-red'], '#ff6b55');
});

// [texte, fond, nature] : « text » = 4,5:1, « large » = 3:1 (grand texte, filets, aplats)
const PAIRS = [
	['--ink', '--paper', 'text'],
	['--ink-soft', '--paper', 'text'],
	['--ink-red-text', '--paper', 'text'],
	['--ink-red', '--paper', 'large'],
	['--paper', '--ink', 'text'],
];

for (const theme of ['light', 'dark']) {
	for (const [foreground, background, kind] of PAIRS) {
		test(`contraste ${theme} : ${foreground} sur ${background} (${kind})`, () => {
			const resolved = { ...tokens.light, ...tokens[theme] };
			assert.ok(resolved[foreground] && resolved[background], 'jeton manquant');
			assert.equal(meetsWcag(resolved[foreground], resolved[background], kind), true);
		});
	}
}
