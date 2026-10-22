import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { DIST_DIR, readDistHtml } from '../scripts/lib/dist.mjs';

const SRC_DIR = new URL('../src/', import.meta.url).pathname;
const pages = readDistHtml();
const pageNamed = (suffix) => {
	const page = pages.find(({ file }) => file.endsWith(suffix));
	assert.ok(page, suffix);
	return page.html;
};
const sourceFiles = () =>
	readdirSync(SRC_DIR, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name));

const EXPECTED_ARTICLES = {
	projets: ['using-mdx', 'first-post'],
	'open-source': ['second-post'],
	ia: ['third-post'],
	souverainete: ['markdown-style-guide'],
	politique: [],
};
const EXPECTED_H1 = {
	projets: '§01 Projets',
	'open-source': '§02 Open source',
	ia: '§03 IA',
	souverainete: '§04 Souveraineté',
	politique: '§05 Politique',
};

test('dist/client/rubriques contient exactement les 5 dossiers de rubrique', () => {
	const folders = readdirSync(join(DIST_DIR, 'rubriques'), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(folders, Object.keys(EXPECTED_H1).sort());
});

test('le H1 de chaque rubrique affiche « §0N Libellé »', () => {
	for (const [slug, h1] of Object.entries(EXPECTED_H1)) {
		const html = pageNamed(`rubriques/${slug}/index.html`);
		const text = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '').trim();
		assert.equal(text, h1, slug);
	}
});

const mainOf = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';

test('chaque rubrique liste ses articles, du plus récent au plus ancien', () => {
	for (const [slug, ids] of Object.entries(EXPECTED_ARTICLES)) {
		const hrefs = [...mainOf(pageNamed(`rubriques/${slug}/index.html`)).matchAll(/href="(\/blog\/[^"]+)"/g)]
			.map(([, href]) => href)
			.filter((href) => href !== '/blog/');
		assert.deepEqual(hrefs, ids.map((id) => `/blog/${id}/`), slug);
	}
});

test("une rubrique vide affiche son message et un lien vers l'archive", () => {
	const main = mainOf(pageNamed('rubriques/politique/index.html')).replaceAll('&#39;', "'");
	assert.match(main, /Rien d'imprimé ici pour l'instant/);
	assert.match(main, /href="\/blog\/"/);
	assert.doesNotMatch(mainOf(pageNamed('rubriques/ia/index.html')), /Rien d'imprimé/);
});

const navOf = (html) => html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? '';
const navLinks = (html) =>
	[...navOf(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attributes, text]) => ({
		href: attributes.match(/href="([^"]*)"/)?.[1],
		current: /aria-current="page"/.test(attributes),
		text: text.trim(),
	}));

test('la navigation contient les 5 rubriques après les 3 liens existants', () => {
	assert.deepEqual(navLinks(pageNamed('client/index.html')).map(({ href }) => href), [
		'/',
		'/blog/',
		'/about/',
		'/rubriques/projets/',
		'/rubriques/open-source/',
		'/rubriques/ia/',
		'/rubriques/souverainete/',
		'/rubriques/politique/',
	]);
});

test('sur /rubriques/ia/, seul le lien IA est en aria-current', () => {
	const current = navLinks(pageNamed('rubriques/ia/index.html'))
		.filter(({ current }) => current)
		.map(({ href }) => href);
	assert.deepEqual(current, ['/rubriques/ia/']);
});

test("les gabarits d'URL /blog/${…} et /rubriques/${…} n'existent que dans src/lib/url.ts", () => {
	const offenders = sourceFiles()
		.filter((file) => !file.endsWith('/lib/url.ts'))
		.filter((file) => /[`'"]\/(blog|rubriques)\/\$\{/.test(readFileSync(file, 'utf8')));
	assert.deepEqual(offenders, []);
});

test('rss.xml.js construit ses liens avec src/lib/url', () => {
	assert.match(readFileSync(join(SRC_DIR, 'pages/rss.xml.js'), 'utf8'), /lib\/url/);
});

test('le schéma exige une category tirée de CATEGORIES et les articles en ont une valide', () => {
	assert.match(readFileSync(join(SRC_DIR, 'content.config.ts'), 'utf8'), /category:\s*z\.enum\(CATEGORY_SLUGS\)/);
	const dir = join(SRC_DIR, 'content/blog');
	for (const name of readdirSync(dir)) {
		const category = readFileSync(join(dir, name), 'utf8').match(/^category:\s*'?([\w-]+)'?\s*$/m)?.[1];
		assert.ok(Object.keys(EXPECTED_H1).includes(category), `${name} : ${category}`);
	}
});

test("la page de rubrique tire ses textes et son lien d'archive de consts.ts et lib/url.ts", () => {
	const page = readFileSync(join(SRC_DIR, 'pages/rubriques/[slug].astro'), 'utf8');
	assert.doesNotMatch(page, /Parcourir l'archive/);
	assert.doesNotMatch(page, /Les articles de la rubrique/);
	assert.doesNotMatch(page, /href="\/blog\/"/);
});
