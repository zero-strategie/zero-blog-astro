/** Titre qui fait d'un bloc `shared.quote` un passage d'opinion (convention éditoriale du CMS). */
const OPINION_QUOTE_TITLE = 'point de vue';

/**
 * « Point de vue », quelles que soient la casse, les espaces et un deux-points final.
 * @param {string | undefined} title
 * @returns {boolean}
 */
export function isOpinionQuoteTitle(title) {
	if (title === undefined) return false;
	return (
		title.trim().replace(/\s+/g, ' ').replace(/\s*:$/, '').toLowerCase() === OPINION_QUOTE_TITLE
	);
}
