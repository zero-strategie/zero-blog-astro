import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { listDistFiles, pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const pages = readDistHtml();

const pageNamed = (suffix) => {
	const page = pages.find(({ file }) => file.endsWith(suffix));
	assert.ok(page, suffix);
	return page.html;
};

const headerOf = (html) => html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';

test("l'en-tête de chaque page affiche « zero-stratégie » et son sous-titre", () => {
	for (const { file, html } of pages) {
		const header = headerOf(html);
		assert.match(header, />zero-stratégie</, file);
		assert.match(header, /carnet indépendant — open source, IA, souveraineté/, file);
	}
});

const navsOf = (html) => html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/g) ?? [];
const navOf = (html) => navsOf(html)[0] ?? '';
const rubriquesNavOf = (html) => navsOf(html)[1] ?? '';
const links = (html) => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];

test('la navigation principale est un <nav aria-label> limité à Accueil, Archive et À propos', () => {
	const nav = navOf(pageNamed('client/index.html'));
	assert.match(nav, /^<nav\b[^>]*\baria-label="[^"]+"/);
	const entries = links(nav).map(([, attributes, text]) => [
		attributes.match(/href="([^"]*)"/)?.[1],
		text.trim(),
	]);
	assert.deepEqual(entries, [
		['/', 'Accueil'],
		['/blog/', 'Archive'],
		['/about/', 'À propos'],
	]);
});

const labelOf = (nav) => nav.match(/^<nav\b[^>]*\baria-label="([^"]+)"/)?.[1];

test('la seconde ligne « rubriques » est un <nav> distinct, labellisé autrement, avec 5 liens §0N', () => {
	const html = pageNamed('client/index.html');
	assert.equal(navsOf(html).length, 2);
	assert.ok(labelOf(rubriquesNavOf(html)));
	assert.notEqual(labelOf(rubriquesNavOf(html)), labelOf(navOf(html)));
	const entries = links(rubriquesNavOf(html)).map(([, attributes, text]) => [
		attributes.match(/href="([^"]*)"/)?.[1],
		text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
	]);
	assert.deepEqual(entries, [
		['/rubriques/projets/', '§01 Projets'],
		['/rubriques/open-source/', '§02 Open source'],
		['/rubriques/ia/', '§03 IA'],
		['/rubriques/souverainete/', '§04 Souveraineté'],
		['/rubriques/politique/', '§05 Politique'],
	]);
});

test('les rubriques défilent horizontalement sur une ligne, avec snap et focus visible, sans JS', () => {
	const css = pageCss(pageNamed('client/index.html')).replace(/\s+/g, '');
	const rule = css.match(/nav\[[^\]]*\]\.rubriques\{([^}]*)\}/)?.[1] ?? '';
	assert.match(rule, /overflow-x:auto/);
	assert.match(rule, /scroll-snap-type:x/);
	assert.match(rule, /flex-wrap:nowrap|white-space:nowrap/);
	assert.match(rule, /scrollbar-width:none|scrollbar-width:thin/);
	assert.match(css, /nav\[[^\]]*\]\.rubriquesa:focus-visible\{[^}]*outline:/);
});

test('les textes des deux navigations viennent de consts.ts', () => {
	const consts = readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8');
	assert.match(consts, /export const CATEGORIES_NAV_LABEL/);
	const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
	assert.match(header, /CATEGORIES_NAV_LABEL/);
});

const ACTIVE_LABEL_BY_PAGE = {
	'client/index.html': 'Accueil',
	'blog/index.html': 'Archive',
	'blog/first-post/index.html': 'Archive',
	'about/index.html': 'À propos',
};

test('seul le lien de la section courante porte aria-current="page"', () => {
	for (const [suffix, label] of Object.entries(ACTIVE_LABEL_BY_PAGE)) {
		const current = navsOf(pageNamed(suffix))
			.flatMap((nav) => links(nav))
			.filter(([, attributes]) => /\baria-current="page"/.test(attributes))
			.map(([, , text]) => text.trim());
		assert.deepEqual(current, [label], suffix);
	}
});

const footerOf = (html) => html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';

test('le pied de page lie la licence CC BY-SA 4.0, le flux RSS et le dépôt source', () => {
	for (const { file, html } of pages.filter(({ file }) => file.endsWith('.html'))) {
		const hrefs = links(footerOf(html)).map(([, attributes]) => attributes.match(/href="([^"]*)"/)?.[1]);
		assert.ok(hrefs.includes('https://creativecommons.org/licenses/by-sa/4.0/deed.fr'), file);
		assert.ok(hrefs.includes('/rss.xml'), file);
		assert.ok(hrefs.includes('https://github.com/zero-strategie/zero-blog-astro'), file);
	}
});

test('aucune trace du gabarit Astro dans dist/client', () => {
	const forbidden = /Astro Blog|Your name here|Welcome to my website|withastro|astrodotbuild/;
	for (const file of listDistFiles().filter((name) => /\.(html|xml|css|svg|txt)$/.test(name))) {
		assert.doesNotMatch(readFileSync(file, 'utf8'), forbidden, file);
	}
});

test('tout lien target="_blank" porte rel="noopener noreferrer"', () => {
	for (const { file, html } of pages) {
		for (const [tag] of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
			assert.match(tag, /\brel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b|\brel="[^"]*\bnoreferrer\b[^"]*\bnoopener\b/, `${file} : ${tag}`);
		}
	}
});

test('first-post affiche « 8 juillet 2022 » avec un datetime du 2022-07-08', () => {
	const html = pageNamed('blog/first-post/index.html');
	const time = html.match(/<time datetime="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/time>/);
	assert.ok(time, '<time> introuvable');
	assert.match(time[1], /^2022-07-08/);
	assert.equal(time[2], '8 juillet 2022');
});

test('les textes de la coque viennent de consts.ts, pas des composants', () => {
	const hardcoded = {
		'layouts/Layout.astro': [/Aller au contenu/],
		'components/Header.astro': [/Navigation principale/],
		'components/Footer.astro': [/contenu sous licence/, />\s*RSS\s*</, />\s*GitHub\s*</],
	};
	for (const [file, patterns] of Object.entries(hardcoded)) {
		const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
		for (const pattern of patterns) assert.doesNotMatch(source, pattern, file);
	}
});

test("le lien d'évitement apparaît sur :focus et garde son anneau dans la fenêtre", () => {
	const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8').replace(/\s+/g, '');
	const rule = css.match(/\.skip-link:focus\{([^}]*)\}/)?.[1] ?? '';
	assert.match(rule, /transform:none/);
	assert.match(rule, /outline-offset:-/);
});

test('masthead en Fraunces très gras, navigation en monospace capitales', () => {
	const css = pageCss(pageNamed('client/index.html')).replace(/\s+/g, '');
	const rule = (selector) => css.match(new RegExp(`${selector}[^{}]*\\{([^}]*)\\}`))?.[1] ?? '';
	assert.match(rule('\\.masthead'), /font-weight:900/);
	assert.match(rule('\\.masthead'), /font-family:var\(--font-text\)/);
	assert.match(rule('nav\\[[^\\]]*\\]a'), /font-family:var\(--font-mono\)/);
	assert.match(rule('nav\\[[^\\]]*\\]a'), /text-transform:uppercase/);
	assert.match(rule('nav\\[[^\\]]*\\]a\\[aria-current=page\\]'), /border-bottom-color:var\(--ink-red\)|text-decoration-color:var\(--ink-red\)/);
});

test('le survol de la navigation ne retire pas le filet rouge du lien actif', () => {
	const css = pageCss(pageNamed('client/index.html')).replace(/\s+/g, '');
	const hover = css.match(/nav\[[^\]]*\]a[^{}]*:hover\{/g) ?? [];
	assert.ok(hover.length > 0);
	for (const selector of hover) assert.match(selector, /:not\(\[aria-current\]\)/, selector);
});
