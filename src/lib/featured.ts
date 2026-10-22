export const SUMMARY_LIMIT = 20;

type Dated = { data: { pubDate: Date } };

export function splitFeatured<T extends Dated>(posts: readonly T[]): { featured: T | undefined; summary: T[] } {
	const [featured, ...older] = [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
	return { featured, summary: older.slice(0, SUMMARY_LIMIT) };
}
