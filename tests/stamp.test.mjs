import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const pages = readDistHtml();
const EXPECTED_STAMPS = {
	'first-post': { slug: 'projets', text: '§01 Projets' },
	'using-mdx': { slug: 'projets', text: '§01 Projets' },
	'second-post': { slug: 'open-source', text: '§02 Open source' },
	'third-post': { slug: 'ia', text: '§03 IA' },
	'markdown-style-guide': { slug: 'souverainete', text: '§04 Souveraineté' },
};
const articleHtml = (id) => {
	const page = pages.find(({ file }) => file.endsWith(`blog/${id}/index.html`));
	assert.ok(page, id);
	return page.html;
};
const stampsOf = (html) =>
	[...html.matchAll(/<a\b([^>]*\bclass="[^"]*\bstamp\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)].map(([, attributes, inner]) => ({
		href: attributes.match(/href="([^"]*)"/)?.[1],
		text: inner.replace(/<[^>]+>/g, '').trim(),
	}));

test('chaque article contient exactement un tampon vers sa rubrique, avec numéro et libellé', () => {
	for (const [id, { slug, text }] of Object.entries(EXPECTED_STAMPS)) {
		assert.deepEqual(stampsOf(articleHtml(id)), [{ href: `/rubriques/${slug}/`, text }], id);
	}
});
