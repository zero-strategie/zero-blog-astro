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

test('la fonte de secours a un size-adjust calé sur le corps de texte (110 à 120 %)', () => {
	const fallback = pageCss(home.html).match(/@font-face\s*{[^}]*fallback[^}]*size-adjust:([\d.]+)%/);
	assert.ok(fallback, 'aucun @font-face de secours avec size-adjust');
	const sizeAdjust = Number(fallback[1]);
	assert.ok(sizeAdjust >= 110 && sizeAdjust <= 120, `size-adjust = ${sizeAdjust} %`);
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

for (const route of ['client/blog/index.html', 'client/blog/first-post/index.html']) {
	test(`${route} : la date utilise var(--font-mono)`, () => {
		const { html } = pages.find(({ file }) => file.endsWith(route));
		assert.match(pageCss(html), /\.date[^{]*{[^}]*font-family:\s*var\(--font-mono\)/);
	});
}

const SYSTEM_FALLBACKS = [
	{ family: 'Fraunces fallback Times', local: 'Liberation Serif' },
	{ family: 'Fraunces fallback Noto', local: 'Noto Serif' },
	{ family: 'Fraunces fallback DejaVu', local: 'DejaVu Serif' },
];

function fontFaces(css, family) {
	const blocks = css.matchAll(/@font-face\s*{[^}]*}/g);
	return [...blocks]
		.map(([face]) => face)
		.filter((face) => new RegExp(`font-family:\\s*["']?${family}["']?;`).test(face));
}

const weightRange = (face) => face.match(/font-weight:\s*(\d+)\s+(\d+)/)?.slice(1).map(Number);

test('chaque famille de secours a une face Regular (400-500) et une face Bold (600-900), aux métriques ajustées', () => {
	const css = pageCss(home.html).replace(/\s+/g, ' ');
	for (const { family, local } of SYSTEM_FALLBACKS) {
		const faces = fontFaces(css, family);
		assert.equal(faces.length, 2, `${family} : ${faces.length} face(s)`);
		const regular = faces.find((face) => weightRange(face)?.[0] === 400);
		const bold = faces.find((face) => weightRange(face)?.[0] >= 600);
		assert.ok(regular && weightRange(regular)[1] <= 500, `${family} : face Regular 400-500 absente`);
		assert.ok(bold && weightRange(bold)[1] === 900, `${family} : face Bold 600-900 absente`);
		assert.ok(regular.includes(`local('${local}')`) || regular.includes(`local("${local}")`), `${family} : local(${local})`);
		assert.match(bold, /local\(["'][^"']*Bold["']\)/, `${family} : source local(... Bold) absente`);
		for (const face of faces) {
			const sizeAdjust = Number(face.match(/size-adjust:\s*([\d.]+)%/)?.[1]);
			assert.ok(sizeAdjust >= 90 && sizeAdjust <= 125, `${family} : size-adjust = ${sizeAdjust}`);
			assert.match(face, /ascent-override:\s*[\d.]+%/);
			assert.match(face, /descent-override:\s*[\d.]+%/);
			assert.match(face, /line-gap-override:\s*0%/);
		}
		assert.notEqual(
			regular.match(/size-adjust:[^;]+/)[0],
			bold.match(/size-adjust:[^;]+/)[0],
			`${family} : la face Bold doit avoir ses propres métriques`,
		);
	}
});

test('--font-text enchaîne Fraunces, les fontes de secours ajustées, puis Georgia et serif', () => {
	const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
	const stack = tokens
		.match(/--font-text:([^;]*);/)?.[1]
		.split(',')
		.map((family) => family.replace(/['"]/g, '').trim());
	assert.deepEqual(stack, [
		'var(--font-fraunces)',
		'Fraunces fallback Times',
		'Fraunces fallback Noto',
		'Fraunces fallback DejaVu',
		'Georgia',
		'serif',
	]);
});

test("Astro n'ajoute pas Georgia ni serif derrière Fraunces (les secours système seraient inatteignables)", () => {
	assert.match(pageCss(home.html), /--font-fraunces:\s*Fraunces-[0-9a-f]+;/);
});
