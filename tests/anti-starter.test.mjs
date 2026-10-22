import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { test } from 'node:test';
import { listDistFiles } from '../scripts/lib/dist.mjs';

const TEXT_EXTENSIONS = ['.html', '.xml', '.css', '.svg', '.txt'];
const STARTER_TEXT = /Astro Blog|Hello, Astronaut|withastro|Atkinson/i;
const ARTICLE_PAGE = /[\\/]blog[\\/][^\\/]+[\\/]index\.html$/;
const ARTICLE_BODY = /<div class="content"[^>]*>[\s\S]*?<\/div>\s*<\/article>/;

const textFiles = listDistFiles()
	.filter((file) => TEXT_EXTENSIONS.includes(extname(file)))
	.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

test('aucun texte du gabarit Astro ne subsiste dans dist/client', () => {
	assert.ok(textFiles.length > 0);
	const offenders = textFiles.filter(({ text }) => STARTER_TEXT.test(text)).map(({ file }) => file);
	assert.deepEqual(offenders, []);
});

test('« Lorem » reste dans le corps des articles de démo, jamais dans meta, og, twitter ni rss.xml', () => {
	const articles = textFiles.filter(({ file }) => ARTICLE_PAGE.test(file));
	assert.ok(articles.length >= 5, `${articles.length} articles`);
	let loremInBodies = 0;
	for (const { file, text } of textFiles) {
		const body = ARTICLE_PAGE.test(file) ? text.match(ARTICLE_BODY)?.[0] ?? '' : '';
		if (/Lorem/i.test(body)) loremInBodies += 1;
		assert.doesNotMatch(text.replace(body, ''), /Lorem/i, file);
	}
	assert.ok(loremInBodies > 0, 'aucun corps ne contient Lorem : le test passerait à vide');
});
