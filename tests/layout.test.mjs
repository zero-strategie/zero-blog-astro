import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { listDistFiles, readDistHtml } from '../scripts/lib/dist.mjs';

const pages = readDistHtml();
const SRC_DIR = new URL('../src/', import.meta.url).pathname;

function sourceFiles(dir = SRC_DIR) {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name));
}

test('chaque page commence par <!DOCTYPE html> et déclare lang="fr"', () => {
	assert.ok(pages.length > 0);
	for (const { file, html } of pages) {
		assert.match(html, /^<!DOCTYPE html>/i, file);
		assert.match(html.match(/<html\b[^>]*>/)?.[0] ?? '', /\blang="fr"/, file);
	}
});

test('seul Layout.astro contient la balise <html', () => {
	const owners = sourceFiles()
		.filter((file) => file.endsWith('.astro') && /<html[\s>]/i.test(readFileSync(file, 'utf8')))
		.map((file) => file.slice(SRC_DIR.length));
	assert.deepEqual(owners, ['layouts/Layout.astro']);
});

test('le favicon est le SVG, sans favicon.ico dans le head ni dans dist/client', () => {
	for (const { file, html } of pages) {
		assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/, file);
		assert.doesNotMatch(html, /favicon\.ico/, file);
	}
	const icons = listDistFiles().filter((file) => file.endsWith('favicon.ico'));
	assert.deepEqual(icons, []);
});

const OG_DEFAULT_URL = 'https://zero-strategie.dev/og-default.png';
const PNG_SIGNATURE = '89504e470d0a1a0a';

function pngSize(buffer) {
	assert.equal(buffer.subarray(0, 8).toString('hex'), PNG_SIGNATURE, "pas un PNG");
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const pageNamed = (suffix) => {
	const page = pages.find(({ file }) => file.endsWith(suffix));
	assert.ok(page, suffix);
	return page.html;
};

const metaContent = (html, attribute, name) =>
	html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`))?.[1];

test('og-default.png fait 1200×630', () => {
	const file = new URL('../public/og-default.png', import.meta.url);
	assert.deepEqual(pngSize(readFileSync(file)), { width: 1200, height: 630 });
});

test("l'accueil partage og-default.png en fr_FR", () => {
	const html = pageNamed('client/index.html');
	assert.equal(metaContent(html, 'property', 'og:image'), OG_DEFAULT_URL);
	assert.equal(metaContent(html, 'property', 'twitter:image'), OG_DEFAULT_URL);
	assert.equal(metaContent(html, 'property', 'og:locale'), 'fr_FR');
});

test('un article avec couverture partage sa couverture', () => {
	const html = pageNamed('blog/first-post/index.html');
	const image = metaContent(html, 'property', 'og:image');
	assert.match(image, /^https:\/\/zero-strategie\.dev\/_astro\/.+\.(jpg|webp|png)$/);
	assert.equal(metaContent(html, 'property', 'twitter:image'), image);
});

test('aucun blog-placeholder-1 dans les meta, accueil, /about/ et /blog/', () => {
	for (const suffix of ['client/index.html', 'about/index.html', 'blog/index.html']) {
		const metas = pageNamed(suffix).match(/<meta\b[^>]*>/g) ?? [];
		assert.ok(metas.length > 0, suffix);
		for (const meta of metas) assert.doesNotMatch(meta, /blog-placeholder-1/, suffix);
	}
});

test('aucun ClientRouter : pas de routeur client dans les pages ni dans les sources', () => {
	for (const { file, html } of pages) assert.doesNotMatch(html, /astro-route|ClientRouter/i, file);
	const users = sourceFiles().filter((file) => /ClientRouter/.test(readFileSync(file, 'utf8')));
	assert.deepEqual(users, []);
});

test('le premier lien du body est « Aller au contenu » vers l’id du <main>', () => {
	for (const { file, html } of pages) {
		const body = html.slice(html.indexOf('<body'));
		const firstLink = body.match(/<a\b[^>]*>([\s\S]*?)<\/a>/);
		assert.ok(firstLink, file);
		assert.equal(firstLink[1].trim(), 'Aller au contenu', file);
		const target = firstLink[0].match(/\bhref="#([^"]+)"/)?.[1];
		assert.ok(target, `${file} : href="#…" attendu`);
		assert.match(body, new RegExp(`<main\\b[^>]*\\bid="${target}"`), file);
	}
});
