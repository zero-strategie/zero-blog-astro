import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { DIST_DIR } from '../scripts/lib/dist.mjs';
import { checkWeight } from '../scripts/lib/weight.mjs';

const CLI = new URL('../scripts/check-weight.mjs', import.meta.url).pathname;
const KB = 1024;
const roots = [];

after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

/** Construit un dist fictif conforme, surchargé par `overrides` (chemin -> contenu, null pour supprimer). */
function fixture(overrides = {}) {
	const root = mkdtempSync(join(tmpdir(), 'check-weight-'));
	roots.push(root);
	const files = {
		'index.html': '<!doctype html><link rel="stylesheet" href="/a.css"><p>accueil</p>',
		'a.css': 'p{color:red}',
		...overrides,
	};
	for (const [path, content] of Object.entries(files)) {
		if (content === null) continue;
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
	return root;
}

const rules = (root) => checkWeight(root).violations.map(({ rule }) => rule);

test('un dist conforme ne produit aucune violation et rapporte le poids CSS par page', () => {
	const result = checkWeight(fixture());
	assert.deepEqual(result.violations, []);
	assert.equal(result.pages.length, 1);
	assert.equal(result.pages[0].cssBytes, 'p{color:red}'.length);
	assert.ok(result.pages[0].cssGzipBytes > 0);
	assert.ok(result.home.totalBytes > 0 && result.home.totalGzipBytes > 0);
});

test('CSS liée de plus de 15 KB : règle css-15kb', () => {
	const root = fixture({ 'a.css': `p{content:"${'x'.repeat(15 * KB)}"}` });
	assert.deepEqual(rules(root), ['css-15kb']);
});

test('CSS inline de plus de 15 KB : règle css-15kb', () => {
	const root = fixture({
		'index.html': `<style>p{content:"${'x'.repeat(15 * KB)}"}</style>`,
		'a.css': null,
	});
	assert.deepEqual(rules(root), ['css-15kb']);
});

test('CSS liée plus inline cumulées au-delà de 15 KB : règle css-15kb', () => {
	const half = 'x'.repeat(8 * KB);
	const root = fixture({
		'index.html': `<link rel="stylesheet" href="/a.css"><style>p{content:"${half}"}</style>`,
		'a.css': `p{content:"${half}"}`,
	});
	assert.deepEqual(rules(root), ['css-15kb']);
});

test('accueil de plus de 100 KB hors images : règle home-100kb, images exclues', () => {
	const heavy = fixture({ 'index.html': `<p>${'x'.repeat(100 * KB)}</p>` });
	assert.deepEqual(rules(heavy), ['home-100kb']);
	const withImage = fixture({ 'img/photo.jpg': 'x'.repeat(200 * KB) });
	assert.deepEqual(rules(withImage), []);
});

test('deux fontes : règle une-webfont', () => {
	const root = fixture({ 'f/a.woff2': 'wOF2', 'f/b.woff2': 'wOF2' });
	assert.deepEqual(rules(root), ['une-webfont']);
});

test('une fonte de plus de 50 KB : règle font-50kb', () => {
	const root = fixture({ 'f/a.woff2': 'x'.repeat(51 * KB) });
	assert.ok(rules(root).includes('font-50kb'));
});

test('une balise script : règle zero-js', () => {
	const root = fixture({ 'index.html': '<script>1</script>' });
	const { violations } = checkWeight(root);
	assert.equal(violations[0].rule, 'zero-js');
	assert.match(violations[0].detail, /script/);
});

test('un attribut onclick : règle zero-js', () => {
	const root = fixture({ 'index.html': '<a href="#" onclick="x()">a</a>' });
	const { violations } = checkWeight(root);
	assert.equal(violations[0].rule, 'zero-js');
	assert.match(violations[0].detail, /onclick/);
});

test('un fichier .js dans le dist : règle zero-js', () => {
	assert.deepEqual(rules(fixture({ '_astro/x.js': '1' })), ['zero-js']);
});

test('CLI : code 1 et nom de la règle sur un dist en dépassement', () => {
	const root = fixture({ 'index.html': '<script>1</script>' });
	const run = spawnSync(process.execPath, [CLI, root], { encoding: 'utf8' });
	assert.equal(run.status, 1);
	assert.match(run.stdout + run.stderr, /zero-js/);
});

test('CLI : code 1 et invite à lancer pnpm build si le dist est absent', () => {
	const run = spawnSync(process.execPath, [CLI, '/chemin/inexistant/dist/client'], { encoding: 'utf8' });
	assert.equal(run.status, 1);
	assert.match(run.stderr, /pnpm build/);
});

test('CLI : code 0 et poids affichés sur le build réel', () => {
	const run = spawnSync(process.execPath, [CLI, DIST_DIR], { encoding: 'utf8' });
	assert.equal(run.status, 0, run.stdout + run.stderr);
	assert.match(run.stdout, /index\.html/);
	assert.match(run.stdout, /gzip/);
	assert.match(run.stdout, /Accueil/);
});
