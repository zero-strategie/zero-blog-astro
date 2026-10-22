import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';
import { readingTime } from '../src/lib/reading-time.mjs';

const pages = readDistHtml();
const BLOG_DIR = new URL('../src/content/blog/', import.meta.url);
const ARTICLE_IDS = readdirSync(BLOG_DIR).map((name) => name.replace(/\.mdx?$/, ''));
const articleHtml = (id) => {
	const page = pages.find(({ file }) => file.endsWith(`blog/${id}/index.html`));
	assert.ok(page, id);
	return page.html;
};
const sourceOf = (id) => {
	const name = readdirSync(BLOG_DIR).find((candidate) => candidate.replace(/\.mdx?$/, '') === id);
	return readFileSync(new URL(name, BLOG_DIR), 'utf8');
};
const bodyOf = (source) => source.replace(/^---\n[\s\S]*?\n---\n/, '');
const frontmatterValue = (source, key) =>
	source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '');
const css = (id) => pageCss(articleHtml(id)).replace(/\s+/g, ' ');

const withoutSupportsBlocks = (stylesheet) => {
	let result = '';
	let index = 0;
	while (index < stylesheet.length) {
		const start = stylesheet.indexOf('@supports', index);
		if (start === -1) return result + stylesheet.slice(index);
		result += stylesheet.slice(index, start);
		let depth = 0;
		let cursor = stylesheet.indexOf('{', start);
		do {
			depth += stylesheet[cursor] === '{' ? 1 : stylesheet[cursor] === '}' ? -1 : 0;
			cursor += 1;
		} while (depth > 0);
		index = cursor;
	}
	return result;
};

test('chaque article affiche « N min de lecture », N étant le temps de lecture de son texte source', () => {
	for (const id of ARTICLE_IDS) {
		const minutes = readingTime(bodyOf(sourceOf(id)));
		assert.match(articleHtml(id).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), new RegExp(`\\b${minutes} min de lecture`), id);
	}
});

test("l'en-tête suit l'ordre tampon, H1, date puis temps de lecture", () => {
	for (const id of ARTICLE_IDS) {
		const html = articleHtml(id);
		const positions = ['class="stamp', '<h1', '<time', 'min de lecture'].map((marker) => html.indexOf(marker));
		assert.ok(positions.every((position) => position > -1), `${id} : ${positions}`);
		assert.deepEqual([...positions].sort((a, b) => a - b), positions, id);
	}
});

test("la date et le temps de lecture sont en monospace", () => {
	assert.match(css('first-post'), /\.date\[data-astro-cid-[\w]+\]\s*\{[^}]*font-family:\s*var\(--font-mono\)/);
});

test("l'alt de la couverture vaut heroAlt, non vide", () => {
	for (const id of ARTICLE_IDS) {
		const heroAlt = frontmatterValue(sourceOf(id), 'heroAlt');
		assert.ok(heroAlt, id);
		const cover = articleHtml(id).match(/<div class="hero-image[^"]*"[^>]*>\s*<img\b[^>]*>/)?.[0] ?? '';
		assert.match(cover, new RegExp(`alt="${heroAlt}"`), id);
	}
});

test("la couverture est bichrome comme à l'accueil : niveaux de gris multipliés sur l'aplat rouge", () => {
	const stylesheet = css('first-post');
	assert.match(stylesheet, /\.riso[^{]*\{[^}]*background:\s*var\(--ink-red\)/);
	assert.match(stylesheet, /\.riso[^{]*img[^{]*\{[^}]*filter:\s*grayscale\(1\)[^}]*mix-blend-mode:\s*multiply/);
});

test('la colonne de lecture est limitée par var(--measure)', () => {
	assert.match(css('first-post'), /\.prose[^{]*\{[^}]*var\(--measure\)/);
});

test('la lettrine porte sur le ::first-letter du premier paragraphe, en Fraunces rouge riso', () => {
	const rule = css('first-post').match(/[^}]*p:first-of-type::?first-letter\s*\{([^}]*)\}/)?.[1] ?? '';
	assert.match(rule, /color:\s*var\(--ink-red\)/);
	assert.match(rule, /font-family:\s*var\(--font-text\)/);
	assert.match(rule, /float:\s*left/);
});

test("initial-letter n'apparaît que sous @supports", () => {
	const stylesheet = css('first-post');
	assert.match(stylesheet, /@supports[^{]*initial-letter[^{]*\{/);
	assert.doesNotMatch(withoutSupportsBlocks(stylesheet), /initial-letter/);
});

test('les citations sont des tracts : bloc encadré, filet rouge épais, texte en encre, sans guillemets générés', () => {
	const rule = css('markdown-style-guide').match(/(?:^|[}\s])blockquote\s*\{([^}]*)\}/)?.[1] ?? '';
	assert.match(rule, /border:\s*2px solid var\(--ink\)/);
	assert.match(rule, /border-left:\s*[\d.]+rem solid var\(--ink-red\)/);
	assert.match(rule, /color:\s*var\(--ink\)/);
	assert.doesNotMatch(rule, /quotes:/);
	assert.doesNotMatch(rule, /color:\s*var\(--ink-red/);
	assert.doesNotMatch(css('markdown-style-guide'), /open-quote|close-quote/);
});

test('« Last updated on » est traduit via consts.ts', () => {
	const layout = readFileSync(new URL('../src/layouts/BlogPost.astro', import.meta.url), 'utf8');
	const consts = readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8');
	assert.doesNotMatch(layout, /Last updated/);
	assert.match(layout, /UPDATED_ON_LABEL/);
	assert.match(consts, /export const UPDATED_ON_LABEL = ['"]Mis à jour le['"]/);
});

test('le traitement bichrome de la couverture est une classe commune .riso, partagée par l’accueil et l’article', () => {
	const stylesheet = css('first-post');
	assert.match(stylesheet, /\.riso\s*\{[^}]*background:\s*var\(--ink-red\)/);
	assert.match(stylesheet, /\.riso img\s*\{[^}]*filter:\s*grayscale\(1\)[^}]*mix-blend-mode:\s*multiply/);
	assert.match(articleHtml('first-post'), /class="hero-image riso/);
	const home = readDistHtml().find(({ file }) => file.endsWith('client/index.html')).html;
	assert.match(home, /class="cover riso/);
	for (const component of ['layouts/BlogPost.astro', 'components/FeaturedArticle.astro']) {
		assert.doesNotMatch(readFileSync(new URL(`../src/${component}`, import.meta.url), 'utf8'), /mix-blend-mode/, component);
	}
});
