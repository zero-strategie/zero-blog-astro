import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findLiteralColors, styleSources } from '../scripts/lib/colors.mjs';

test('détecte un hexadécimal dans une valeur', () => {
	assert.deepEqual(findLiteralColors('a { color: #fff; }'), ['#fff']);
});

test('détecte rgb(), rgba() et hsl() dans une valeur', () => {
	const css = 'a { color: rgb(1, 2, 3); box-shadow: 0 0 rgba(0,0,0,.1); background: hsl(0 0% 0%); }';
	assert.equal(findLiteralColors(css).length, 3);
});

test('ignore un sélecteur #add et un commentaire', () => {
	assert.deepEqual(findLiteralColors('/* #fff */ #add { color: var(--ink); } #bad{margin:0}'), []);
});

test('extrait les blocs style d\'un fichier astro', () => {
	assert.deepEqual(styleSources('<p>x</p><style>a{color:red}</style><style lang="css">b{}</style>'), [
		'a{color:red}',
		'b{}',
	]);
});

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const TOKENS = join(SRC, 'styles', 'tokens.css');

test('seul tokens.css contient des couleurs littérales dans src/', () => {
	const offenders = [];
	for (const entry of readdirSync(SRC, { recursive: true, withFileTypes: true })) {
		const file = join(entry.parentPath, entry.name);
		if (!entry.isFile() || file === TOKENS) continue;
		const extension = extname(file);
		if (!['.css', '.astro'].includes(extension)) continue;
		const source = readFileSync(file, 'utf8');
		const styles = extension === '.css' ? [source] : styleSources(source);
		for (const color of styles.flatMap(findLiteralColors)) offenders.push(`${file}: ${color}`);
	}
	assert.deepEqual(offenders, []);
});
