/**
 * Strapi's REST API reads nested parameters in `qs` bracket notation:
 * `populate[seo][populate]=shareImage`, `filters[category][slug][$eq]=ia`.
 * Brackets are left readable; keys and values are percent-encoded.
 *
 * @typedef {string | number | boolean | undefined | QueryValue[] | QueryParams} QueryValue
 * @typedef {{ [key: string]: QueryValue }} QueryParams
 */

// `$eq`, `$in`… stay readable: `$` is legal in a query string and qs reads it either way.
/** @param {string} key */
const encodeKey = (key) => encodeURIComponent(key).replaceAll('%24', '$');

/**
 * @param {string} prefix
 * @param {QueryValue} value
 * @returns {string[]}
 */
function pairs(prefix, value) {
	if (value === undefined) return [];
	if (Array.isArray(value)) return value.flatMap((v, i) => pairs(`${prefix}[${i}]`, v));
	if (typeof value === 'object') {
		return Object.entries(value).flatMap(([k, v]) => pairs(`${prefix}[${encodeKey(k)}]`, v));
	}
	return [`${prefix}=${encodeURIComponent(String(value))}`];
}

/**
 * @param {QueryParams} params
 * @returns {string}
 */
export function toQueryString(params) {
	return Object.entries(params)
		.flatMap(([k, v]) => pairs(encodeKey(k), v))
		.join('&');
}
