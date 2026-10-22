/**
 * Article repository. Every function returns domain models or throws a
 * StrapiError — never null, never a raw envelope (AGENTS.md 4.6).
 */
import { LOCALE } from '../../consts';
import type { ArticleDetail, ArticleSummary } from '../../types/domain';
import { articleDetailDto, articleSummaryDto } from '../../types/strapi';
import { toArticleDetail, toArticleSummary } from '../mappers/article';
import { strapi } from './client';
import { ARTICLE_DETAIL_POPULATE, ARTICLE_LIST_FIELDS, ARTICLE_LIST_POPULATE } from './populate';
import type { QueryParams } from './query';

const PATH = '/api/articles';

const base = (locale: string): QueryParams => ({
	locale,
	status: 'published',
	sort: ['publishedAt:desc'],
});

const list = async (filters: QueryParams | undefined, locale: string): Promise<ArticleSummary[]> =>
	(
		await strapi.getAll(
			PATH,
			{ ...base(locale), fields: ARTICLE_LIST_FIELDS, populate: ARTICLE_LIST_POPULATE, filters },
			articleSummaryDto,
		)
	).map(toArticleSummary);

/** Every published article, newest first. */
export const getArticles = (locale = LOCALE): Promise<ArticleSummary[]> =>
	list(undefined, locale);

export const getArticlesByCategory = (slug: string, locale = LOCALE): Promise<ArticleSummary[]> =>
	list({ category: { slug: { $eq: slug } } }, locale);

export const getArticlesByTag = (slug: string, locale = LOCALE): Promise<ArticleSummary[]> =>
	list({ tags: { slug: { $eq: slug } } }, locale);

/**
 * Every published article with everything its page renders — one paginated
 * request for the whole build rather than one request per page.
 */
export async function getArticleDetails(locale = LOCALE): Promise<ArticleDetail[]> {
	const dtos = await strapi.getAll(
		PATH,
		{ ...base(locale), populate: ARTICLE_DETAIL_POPULATE },
		articleDetailDto,
	);
	return dtos.map(toArticleDetail);
}
