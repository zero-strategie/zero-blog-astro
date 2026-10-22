/**
 * Strapi's REST API reads nested parameters in `qs` bracket notation:
 * `populate[seo][populate]=shareImage`, `filters[category][slug][$eq]=ia`.
 * Brackets are left readable; keys and values are percent-encoded.
 */
export type QueryValue = string | number | boolean | undefined | QueryValue[] | QueryParams;
export interface QueryParams {
	[key: string]: QueryValue;
}

// `$eq`, `$in`… stay readable: `$` is legal in a query string and qs reads it either way.
const encodeKey = (key: string): string => encodeURIComponent(key).replaceAll('%24', '$');

function pairs(prefix: string, value: QueryValue): string[] {
	if (value === undefined) return [];
	if (Array.isArray(value)) return value.flatMap((v, i) => pairs(`${prefix}[${i}]`, v));
	if (typeof value === 'object') {
		return Object.entries(value).flatMap(([k, v]) => pairs(`${prefix}[${encodeKey(k)}]`, v));
	}
	return [`${prefix}=${encodeURIComponent(String(value))}`];
}

export function toQueryString(params: QueryParams): string {
	return Object.entries(params)
		.flatMap(([k, v]) => pairs(encodeKey(k), v))
		.join('&');
}
