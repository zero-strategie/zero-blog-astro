import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { LANG, SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getArticles } from '../lib/strapi/article';
import { articleHref } from '../lib/url';

export async function GET(context: APIContext) {
	if (!context.site) throw new Error('`site` must be set in astro.config.mjs');
	const articles = await getArticles();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		customData: `<language>${LANG}</language>`,
		items: articles.map((article) => ({
			title: article.title,
			description: article.description,
			pubDate: article.publishedAt,
			link: articleHref(article.slug),
			categories: [article.category?.name, ...article.tags.map((t) => t.name)].filter(
				(c): c is string => Boolean(c),
			),
		})),
	});
}
