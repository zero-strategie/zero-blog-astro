/**
 * Raw Strapi 5 REST shapes — the wire format, and nothing else.
 *
 * The schemas validate every response at the boundary (AGENTS.md 4.8): a
 * contract drift on the CMS side fails the build with the offending path
 * instead of rendering `undefined` somewhere in a template. Nothing outside
 * `src/lib/` may import this file.
 *
 * Contract: cms-zero `src/api/**` and `src/components/**` schemas. Optional
 * Strapi fields come back as `null`, hence `.nullish()` everywhere a field is
 * not `required` on the CMS side.
 */
import { z } from 'astro/zod';

export const mediaDto = z.object({
	url: z.string(),
	alternativeText: z.string().nullish(),
	caption: z.string().nullish(),
	width: z.number().nullish(),
	height: z.number().nullish(),
});

export const categoryDto = z.object({
	name: z.string(),
	slug: z.string(),
	description: z.string().nullish(),
});

export const tagDto = z.object({
	name: z.string(),
	slug: z.string(),
});

export const authorDto = z.object({
	name: z.string(),
	avatar: mediaDto.nullish(),
});

export const contentTypeDto = z.enum(['actualite', 'analyse', 'enquete', 'explainer', 'opinion']);

export const sourceLevelDto = z.enum([
	'primaire',
	'institutionnelle',
	'presse',
	'secondaire',
	'projet',
]);

/** `editorial.source` */
export const sourceDto = z.object({
	titre: z.string(),
	url: z.string(),
	editeur: z.string().nullish(),
	datePublication: z.string().nullish(),
	dateConsultation: z.string(),
	niveau: sourceLevelDto.nullish(),
});

/** `editorial.faq-item` */
export const faqItemDto = z.object({
	question: z.string(),
	reponse: z.string(),
});

/** `shared.seo` */
export const seoDto = z.object({
	metaTitle: z.string().nullish(),
	metaDescription: z.string().nullish(),
	shareImage: mediaDto.nullish(),
});

export const richTextBlockDto = z.object({
	__component: z.literal('shared.rich-text'),
	body: z.string().nullish(),
});

export const quoteBlockDto = z.object({
	__component: z.literal('shared.quote'),
	title: z.string().nullish(),
	body: z.string().nullish(),
});

export const mediaBlockDto = z.object({
	__component: z.literal('shared.media'),
	file: mediaDto.nullish(),
});

export const sliderBlockDto = z.object({
	__component: z.literal('shared.slider'),
	files: z.array(mediaDto).nullish(),
});

export const knownBlockDto = z.discriminatedUnion('__component', [
	richTextBlockDto,
	quoteBlockDto,
	mediaBlockDto,
	sliderBlockDto,
]);

/**
 * A block the frontend does not know yet is accepted and turned into `null`
 * rather than rejected, so a new CMS block degrades to "not rendered" instead
 * of failing every build (AGENTS.md 4.3).
 */
export const blockDto = z.union([
	knownBlockDto,
	z
		.object({ __component: z.string() })
		.loose()
		.transform(() => null),
]);

/** Fields requested by ARTICLE_LIST_POPULATE. */
export const articleSummaryDto = z.object({
	documentId: z.string(),
	title: z.string(),
	description: z.string().nullish(),
	slug: z.string(),
	typeContenu: contentTypeDto,
	publishedAt: z.string(),
	dateMiseAJour: z.string().nullish(),
	cover: mediaDto.nullish(),
	category: categoryDto.nullish(),
	tags: z.array(tagDto).nullish(),
});

/** Fields requested by ARTICLE_DETAIL_POPULATE. */
export const articleDetailDto = articleSummaryDto.extend({
	author: authorDto.nullish(),
	blocks: z.array(blockDto).nullish(),
	sources: z.array(sourceDto).nullish(),
	faq: z.array(faqItemDto).nullish(),
	seo: seoDto.nullish(),
	verifieLe: z.string().nullish(),
	erratum: z.string().nullish(),
});

export const paginationDto = z.object({
	page: z.number(),
	pageSize: z.number(),
	pageCount: z.number(),
	total: z.number(),
});

/** `{ data: T[], meta: { pagination } }` — every collection endpoint. */
export const collectionResponse = <T extends z.ZodType>(item: T) =>
	z.object({
		data: z.array(item),
		meta: z.object({ pagination: paginationDto }),
	});

export type MediaDto = z.infer<typeof mediaDto>;
export type CategoryDto = z.infer<typeof categoryDto>;
export type TagDto = z.infer<typeof tagDto>;
export type AuthorDto = z.infer<typeof authorDto>;
export type SourceDto = z.infer<typeof sourceDto>;
export type FaqItemDto = z.infer<typeof faqItemDto>;
export type SeoDto = z.infer<typeof seoDto>;
export type BlockDto = z.infer<typeof blockDto>;
export type ArticleSummaryDto = z.infer<typeof articleSummaryDto>;
export type ArticleDetailDto = z.infer<typeof articleDetailDto>;
export type Pagination = z.infer<typeof paginationDto>;
