import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { test } from 'node:test';
import { listDistFiles, pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const FONT_SOURCE_DIR = new URL('../src/assets/fonts/', import.meta.url);
const MAX_FONT_BYTES = 50 * 1024;
const FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.otf', '.eot'];
const pages = readDistHtml();
const home = pages.find(({ file }) => file.endsWith('client/index.html'));

test('src/assets/fonts contient un seul woff2 Fraunces, sa licence et son README', () => {
	const files = readdirSync(FONT_SOURCE_DIR).sort();
	assert.equal(files.filter((name) => /^fraunces.*\.woff2$/.test(name)).length, 1);
	assert.ok(files.includes('OFL.txt'));
	assert.ok(files.includes('README.md'));
	assert.deepEqual(files.filter((name) => /atkinson/i.test(name)), []);
});

test('dist/client contient exactement une fonte, en woff2, de 50 KB au plus', () => {
	const fonts = listDistFiles().filter((file) => FONT_EXTENSIONS.includes(extname(file)));
	assert.equal(fonts.length, 1, fonts.join(', '));
	assert.equal(extname(fonts[0]), '.woff2');
	assert.ok(statSync(fonts[0]).size <= MAX_FONT_BYTES);
	assert.equal(readFileSync(fonts[0]).subarray(0, 4).toString('latin1'), 'wOF2');
});

test('atkinson est absent des HTML et CSS de dist/client', () => {
	for (const { file, html } of pages) {
		assert.doesNotMatch(html + pageCss(html), /atkinson/i, file);
	}
});

test('une fonte de secours avec size-adjust est déclarée', () => {
	assert.match(pageCss(home.html), /@font-face\s*{[^}]*size-adjust/);
});

test("l'accueil précharge le woff2 de Fraunces", () => {
	assert.match(home.html, /<link[^>]*rel="preload"[^>]*href="[^"]*\.woff2"[^>]*>/);
});

test('--font-text repose sur Fraunces', () => {
	const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
	assert.match(tokens, /--font-text:[^;]*--font-fraunces/);
});

test("l'axe opsz est exploité par font-optical-sizing: auto", () => {
	assert.match(pageCss(home.html), /font-optical-sizing:\s*auto/);
});
