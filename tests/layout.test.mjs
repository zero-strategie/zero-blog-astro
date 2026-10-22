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
