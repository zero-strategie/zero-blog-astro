/**
 * What the UI consumes. Pages and components import from here, never from
 * `strapi.ts` (AGENTS.md 4.5).
 */

/**
 * HTML produced by `renderMarkdown()` — parsed, sanitised, safe for
 * `set:html`. The brand stops a raw CMS string from being injected by
 * accident: only the renderer can produce one.
 */
export type SafeHtml = string & { readonly __brand: 'SafeHtml' };

export type ContentType = 'actualite' | 'analyse' | 'enquete' | 'explainer' | 'opinion';

export type SourceLevel = 'primaire' | 'institutionnelle' | 'presse' | 'secondaire' | 'projet';

export interface ImageRef {
	/** Absolute URL, already resolved against the CMS origin. */
	url: string;
	alt: string;
	width?: number;
	height?: number;
}

export interface Category {
	name: string;
	slug: string;
	description?: string;
}

export interface Tag {
	name: string;
	slug: string;
}

export interface Author {
	name: string;
	avatar?: ImageRef;
}

export interface Source {
	/** 1-based, matching the `[[n]](#source-n)` calls in the body. */
	index: number;
	title: string;
	url: string;
	publisher?: string;
	publishedOn?: Date;
	consultedOn: Date;
	level?: SourceLevel;
}

export interface FaqItem {
	question: string;
	answer: SafeHtml;
	/** The same answer without markup, for structured data. */
	answerText: string;
}

/** `<head>` metadata, CMS `seo` already resolved over title/description/cover. */
export interface Seo {
	title: string;
	description?: string;
	image?: ImageRef;
}

export interface RichTextBlock {
	__component: 'shared.rich-text';
	html: SafeHtml;
}

export interface QuoteBlock {
	__component: 'shared.quote';
	title?: string;
	html: SafeHtml;
	/** A quote titled « Point de vue » is an opinion passage inside the article. */
	isOpinion: boolean;
}

export interface MediaBlock {
	__component: 'shared.media';
	image?: ImageRef;
	caption?: string;
}

export interface SliderBlock {
	__component: 'shared.slider';
	images: ImageRef[];
}

export type Block = RichTextBlock | QuoteBlock | MediaBlock | SliderBlock;

/** What a listing needs — no blocks, no sources (AGENTS.md 4.4). */
export interface ArticleSummary {
	slug: string;
	title: string;
	description?: string;
	contentType: ContentType;
	publishedAt: Date;
	updatedAt?: Date;
	cover?: ImageRef;
	category?: Category;
	tags: Tag[];
}

export interface ArticleDetail extends ArticleSummary {
	author?: Author;
	blocks: Block[];
	sources: Source[];
	faq: FaqItem[];
	seo: Seo;
	verifiedOn?: Date;
	erratum?: SafeHtml;
}
