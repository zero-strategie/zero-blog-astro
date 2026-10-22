/**
 * Named populate constants, one per use case (AGENTS.md 4.7). Never
 * `populate=*`: it drags every relation and every image format over the wire,
 * and still misses `seo.shareImage`.
 */
import type { QueryParams } from './query';

const MEDIA = { fields: ['url', 'alternativeText', 'caption', 'width', 'height'] };
const CATEGORY = { fields: ['name', 'slug', 'description'] };
const TAG = { fields: ['name', 'slug'] };

/** Scalar fields of an article card. */
export const ARTICLE_LIST_FIELDS = [
	'title',
	'description',
	'slug',
	'typeContenu',
	'publishedAt',
	'dateMiseAJour',
];

/** Listings: cover, category and tags — no blocks, no sources. */
export const ARTICLE_LIST_POPULATE: QueryParams = {
	cover: MEDIA,
	category: CATEGORY,
	tags: TAG,
};

/** Article page: everything the page renders, each block populated by type. */
export const ARTICLE_DETAIL_POPULATE: QueryParams = {
	...ARTICLE_LIST_POPULATE,
	author: { fields: ['name'], populate: { avatar: MEDIA } },
	blocks: {
		on: {
			'shared.rich-text': true,
			'shared.quote': true,
			'shared.media': { populate: { file: MEDIA } },
			'shared.slider': { populate: { files: MEDIA } },
		},
	},
	sources: true,
	faq: true,
	seo: { populate: { shareImage: MEDIA } },
};
