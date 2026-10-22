export const SUMMARY_LIMIT = 20;

/**
 * Sépare l'article à la une (le plus récent) du sommaire (les suivants, plafonnés).
 * @template {{ data: { pubDate: Date } }} T
 * @param {readonly T[]} posts
 * @returns {{ featured: T | undefined, summary: T[] }}
 */
export function splitFeatured(posts) {
	const [featured, ...older] = [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
	return { featured, summary: older.slice(0, SUMMARY_LIMIT) };
}
