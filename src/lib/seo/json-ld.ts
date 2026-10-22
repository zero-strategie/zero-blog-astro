/**
 * schema.org structured data for an article page. Pure functions: the page
 * serialises the result into `<script type="application/ld+json">`.
 */
import { LANG, SITE_TITLE } from '../../consts';
import type { ArticleDetail, FaqItem } from '../../types/domain';

type JsonLd = Record<string, unknown>;

/** `image` is the share image as served by the site, when there is one. */
export function articleJsonLd(article: ArticleDetail, url: URL, image?: string): JsonLd {
	const ld: JsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: article.title,
		description: article.seo.description,
		inLanguage: LANG,
		mainEntityOfPage: url.href,
		datePublished: article.publishedAt.toISOString(),
		// dateMiseAJour, not Strapi's updatedAt, which moves on every save.
		dateModified: (article.updatedAt ?? article.publishedAt).toISOString(),
		author: article.author
			? { '@type': 'Person', name: article.author.name }
			: { '@type': 'Organization', name: SITE_TITLE },
		publisher: { '@type': 'Organization', name: SITE_TITLE, url: new URL('/', url).href },
	};
	if (image) ld.image = image;
	if (article.category) ld.articleSection = article.category.name;
	if (article.tags.length) ld.keywords = article.tags.map((t) => t.name).join(', ');
	if (article.sources.length) ld.citation = article.sources.map((s) => s.url);
	if (ld.description === undefined) delete ld.description;
	return ld;
}

export function faqPageJsonLd(faq: readonly FaqItem[]): JsonLd | undefined {
	if (!faq.length) return undefined;
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answerText },
		})),
	};
}

export { serializeJsonLd } from './serialize.mjs';
