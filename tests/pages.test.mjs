import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readDistHtml } from '../scripts/lib/dist.mjs';

const pages = readDistHtml();
const pageNamed = (suffix) => pages.find(({ file }) => file.endsWith(suffix))?.html ?? '';
const mainOf = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const about = pageNamed('client/about/index.html');
const notFound = pageNamed('client/404.html');

test('/about/ a un H1 « À propos » et le texte de consts.ts, sans Lorem ni time', () => {
	const main = mainOf(about);
	assert.match(main, /<h1\b[^>]*>\s*À propos\s*<\/h1>/);
	assert.match(main, /<p\b[^>]*>[^<]{40,}/);
	assert.doesNotMatch(main, /Lorem/i);
	assert.doesNotMatch(main, /<time\b/);
});

test('/about/ n’a ni barre de lecture ni tampon', () => {
	assert.doesNotMatch(about, /reading-progress|class="[^"]*\bstamp\b/);
});

test('about.astro utilise Layout, pas BlogPost, et lit ABOUT dans consts.ts', () => {
	const page = source('../src/pages/about.astro');
	assert.match(page, /layouts\/Layout\.astro/);
	assert.doesNotMatch(page, /BlogPost|pubDate/);
	assert.match(page, /ABOUT/);
	assert.match(source('../src/consts.ts'), /export const ABOUT\b/);
});

test('404.html existe, en français, avec un H1 « Page introuvable »', () => {
	assert.ok(notFound, '404.html absent de dist/client');
	assert.match(notFound, /<html\b[^>]*\blang="fr"/);
	assert.match(mainOf(notFound), /<h1\b[^>]*>\s*Page introuvable\s*<\/h1>/);
});

test('la 404 lie l’accueil, l’archive et les 5 rubriques depuis son contenu', () => {
	const hrefs = [...mainOf(notFound).matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(([, href]) => href);
	for (const href of ['/', '/blog/', '/rubriques/projets/', '/rubriques/open-source/', '/rubriques/ia/', '/rubriques/souverainete/', '/rubriques/politique/']) {
		assert.ok(hrefs.includes(href), href);
	}
});
