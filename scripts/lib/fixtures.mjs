import { readFileSync } from 'node:fs';

/**
 * Les fixtures Strapi (test/fixtures/*.json) que sert scripts/fixture-server.mjs
 * et sur lesquelles `pnpm test` construit dist/ : les tests en tirent leurs
 * attentes au lieu de les recopier.
 */
const load = (name) =>
	JSON.parse(readFileSync(new URL(`../../test/fixtures/${name}.json`, import.meta.url), 'utf8')).data;

export const FIXTURE_ARTICLES = load('articles');
export const FIXTURE_CATEGORIES = load('categories');
export const FIXTURE_TAGS = load('tags');

/** @param {string} slug */
export const fixtureArticle = (slug) => {
	const article = FIXTURE_ARTICLES.find((candidate) => candidate.slug === slug);
	if (!article) throw new Error(`article ${slug} absent des fixtures`);
	return article;
};

/** Le Markdown lu par le lecteur : blocs de texte riche et citations, dans l'ordre. */
export const readableMarkdown = (article) =>
	(article.blocks ?? [])
		.filter((block) => ['shared.rich-text', 'shared.quote'].includes(block.__component))
		.map((block) => block.body ?? '')
		.join('\n\n');
