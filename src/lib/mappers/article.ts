/**
 * Strapi article DTO → domain. The only code that knows the article's wire
 * shape; Markdown fields leave here already rendered to safe HTML, with their
 * citation calls resolved against the article's own sources.
 */
import type {
	ArticleDetail,
	ArticleSummary,
	Block,
	FaqItem,
	SafeHtml,
	Seo,
	Source,
} from '../../types/domain';
import type { ArticleDetailDto, ArticleSummaryDto, BlockDto, SourceDto } from '../../types/strapi';
import { isHeroAltValid } from '../hero-alt.mjs';
import { markdownToText, type RenderOptions, renderMarkdown } from '../markdown.mjs';
import { readingTime } from '../reading-time.mjs';
import { toImageRef } from './media';
import { toCategory, toTag } from './taxonomy';

/** Title that marks a `shared.quote` as an opinion passage (editorial convention). */
const OPINION_QUOTE_TITLE = 'point de vue';

const date = (value: string | null | undefined): Date | undefined =>
	value ? new Date(value) : undefined;

const normalise = (value: string): string =>
	value.trim().replace(/\s+/g, ' ').replace(/\s*:$/, '').toLowerCase();

export function toArticleSummary(dto: ArticleSummaryDto): ArticleSummary {
	const cover = toImageRef(dto.cover);
	// Same content rule as the former local collection: a cover needs a real text alternative.
	if (!isHeroAltValid({ heroImage: cover, heroAlt: cover?.alt })) {
		console.warn(
			`[strapi] Article « ${dto.slug} » : la couverture n'a pas de texte alternatif ` +
				'(alternativeText vide dans la médiathèque Strapi).',
		);
	}
	return {
		slug: dto.slug,
		title: dto.title,
		description: dto.description ?? undefined,
		contentType: dto.typeContenu,
		publishedAt: new Date(dto.publishedAt),
		updatedAt: date(dto.dateMiseAJour),
		cover,
		category: dto.category ? toCategory(dto.category) : undefined,
		tags: (dto.tags ?? []).map(toTag),
	};
}

const toSource = (dto: SourceDto, i: number): Source => ({
	index: i + 1,
	title: dto.titre,
	url: dto.url,
	publisher: dto.editeur ?? undefined,
	publishedOn: date(dto.datePublication),
	consultedOn: new Date(dto.dateConsultation),
	level: dto.niveau ?? undefined,
});

type Render = (markdown: string) => SafeHtml;

function toBlock(dto: BlockDto, md: Render): Block | undefined {
	// `null` is a block this frontend does not know yet: not rendered (AGENTS.md 4.3).
	if (dto === null) return undefined;
	switch (dto.__component) {
		case 'shared.rich-text':
			return { __component: dto.__component, html: md(dto.body ?? '') };
		case 'shared.quote': {
			const title = dto.title ?? undefined;
			return {
				__component: dto.__component,
				title,
				// `body` is plain text on the CMS side; rendering it as Markdown keeps
				// the paragraphs and resolves any citation call it contains.
				html: md(dto.body ?? ''),
				isOpinion: title !== undefined && normalise(title) === OPINION_QUOTE_TITLE,
			};
		}
		case 'shared.media':
			return {
				__component: dto.__component,
				image: toImageRef(dto.file),
				caption: dto.file?.caption ?? undefined,
			};
		case 'shared.slider':
			return {
				__component: dto.__component,
				images: (dto.files ?? []).flatMap((f) => toImageRef(f) ?? []),
			};
	}
}

/** The Markdown a reader actually reads, block by block. */
function textOf(dto: BlockDto): string {
	if (dto?.__component === 'shared.rich-text' || dto?.__component === 'shared.quote') {
		return dto.body ?? '';
	}
	return '';
}

export function toArticleDetail(dto: ArticleDetailDto): ArticleDetail {
	const summary = toArticleSummary(dto);
	const sources = (dto.sources ?? []).map(toSource);
	const options: RenderOptions = {
		sources,
		onMissingSource: (n) =>
			console.warn(
				`[strapi] Article « ${dto.slug} » : appel de note vers la source ${n}, ` +
					`absente de ses ${sources.length} source(s). Rendu sans lien.`,
			),
	};
	// Body blocks share one set, so each source gets a single margin note, after
	// its first call in reading order. Erratum and FAQ carry calls but no notes.
	const sidenotes = new Set<number>();
	const body: Render = (markdown) => renderMarkdown(markdown, { ...options, sidenotes });
	const md: Render = (markdown) => renderMarkdown(markdown, options);
	const blocks = dto.blocks ?? [];

	const faq: FaqItem[] = (dto.faq ?? []).map((item) => ({
		question: item.question,
		answer: md(item.reponse),
		answerText: markdownToText(item.reponse),
	}));

	const seo: Seo = {
		title: dto.seo?.metaTitle || dto.title,
		description: dto.seo?.metaDescription || summary.description,
		image: toImageRef(dto.seo?.shareImage) ?? summary.cover,
	};

	return {
		...summary,
		author: dto.author
			? { name: dto.author.name, avatar: toImageRef(dto.author.avatar) }
			: undefined,
		blocks: blocks.flatMap((b) => toBlock(b, body) ?? []),
		sources,
		faq,
		seo,
		verifiedOn: date(dto.verifieLe),
		erratum: dto.erratum?.trim() ? md(dto.erratum) : undefined,
		readingMinutes: readingTime(blocks.map(textOf).join('\n\n')),
	};
}
