export const SUMMARY_LIMIT = 20;

/**
 * Sépare l'article à la une (le plus récent) du sommaire (les suivants, plafonnés).
 * @template {{ publishedAt: Date }} T
 * @param {readonly T[]} articles
 * @returns {{ featured: T | undefined, summary: T[] }}
 */
export function splitFeatured(articles) {
	const [featured, ...older] = [...articles].sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());
	return { featured, summary: older.slice(0, SUMMARY_LIMIT) };
}
