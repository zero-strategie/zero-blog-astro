import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readDistHtml } from '../scripts/lib/dist.mjs';

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
