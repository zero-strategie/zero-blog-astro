import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { test } from 'node:test';
import { listDistFiles } from '../scripts/lib/dist.mjs';
import { FIXTURE_ARTICLES } from '../scripts/lib/fixtures.mjs';

const TEXT_EXTENSIONS = ['.html', '.xml', '.css', '.svg', '.txt'];
const STARTER_TEXT = /Astro Blog|Hello, Astronaut|withastro|Atkinson/i;
const ARTICLE_PAGE = /[\\/]blog[\\/][^\\/]+[\\/]index\.html$/;

const textFiles = listDistFiles()
	.filter((file) => TEXT_EXTENSIONS.includes(extname(file)))
	.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

test('aucun texte du gabarit Astro ne subsiste dans dist/client', () => {
	assert.ok(textFiles.length > 0);
	const offenders = textFiles.filter(({ text }) => STARTER_TEXT.test(text)).map(({ file }) => file);
	assert.deepEqual(offenders, []);
});

// Le contenu de démo (Markdown local et Lorem) a disparu avec l'intégration Strapi : plus aucune
// exception n'est tolérée, ni dans les corps d'article ni dans meta, og, twitter ou rss.xml.
test('« Lorem » n’apparaît plus nulle part dans dist/client, articles compris', () => {
	const articles = textFiles.filter(({ file }) => ARTICLE_PAGE.test(file));
	assert.equal(articles.length, FIXTURE_ARTICLES.length, 'une page par article des fixtures');
	assert.ok(textFiles.some(({ file }) => file.endsWith('rss.xml')), 'rss.xml absent : le test passerait à vide');
	for (const { file, text } of textFiles) assert.doesNotMatch(text, /Lorem/i, file);
});

test('aucun contenu local ne subsiste : ni src/content/, ni content.config.ts', () => {
	for (const path of ['../src/content/', '../src/content.config.ts']) {
		assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
	}
});
