import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { listDistFiles, readDistHtml } from '../scripts/lib/dist.mjs';

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

const navOf = (html) => html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? '';
const links = (html) => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];

test('la navigation est un <nav aria-label> avec Accueil, Archive et À propos', () => {
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

const ACTIVE_LABEL_BY_PAGE = {
	'client/index.html': 'Accueil',
	'blog/index.html': 'Archive',
	'blog/first-post/index.html': 'Archive',
	'about/index.html': 'À propos',
};

test('seul le lien de la section courante porte aria-current="page"', () => {
	for (const [suffix, label] of Object.entries(ACTIVE_LABEL_BY_PAGE)) {
		const current = links(navOf(pageNamed(suffix)))
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
