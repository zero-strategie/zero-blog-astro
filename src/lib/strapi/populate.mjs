/**
 * Named populate constants, one per use case (AGENTS.md 4.7). Never
 * `populate=*`: it drags every relation and every image format over the wire,
 * and still misses `seo.shareImage`.
 *
 * @typedef {import('./query.mjs').QueryParams} QueryParams
 */

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

/**
 * Listings: cover, category and tags — no blocks, no sources.
 * @type {QueryParams}
 */
export const ARTICLE_LIST_POPULATE = {
	cover: MEDIA,
	category: CATEGORY,
	tags: TAG,
};

/**
 * Article page: everything the page renders, each block populated by type.
 * @type {QueryParams}
 */
export const ARTICLE_DETAIL_POPULATE = {
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

/**
 * Parameters every article request carries: locale explicit (AGENTS.md §1),
 * published only, newest first.
 * @param {string} locale
 * @returns {QueryParams}
 */
export const articleBaseParams = (locale) => ({
	locale,
	status: 'published',
	sort: ['publishedAt:desc'],
});
