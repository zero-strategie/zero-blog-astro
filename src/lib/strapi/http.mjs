/**
 * HTTP transport to Strapi: base URL, Authorization header, timeout, error
 * normalisation and pagination. Knows nothing about any content type and
 * nothing about validation — `client.ts` wires it to `astro:env` and to the
 * Zod contract. Plain `.mjs` so `node:test` can load it (AGENTS.md §7).
 *
 * Every failure throws a `StrapiError` whose message says what to fix. Pages
 * are prerendered, so a throw here fails the build — deliberately: a site
 * built against an unreachable CMS must not ship as a set of empty pages
 * (AGENTS.md 4.8).
 *
 * @typedef {import('./query.mjs').QueryParams} QueryParams
 *
 * @typedef {object} TransportOptions
 * @property {string} baseUrl
 * @property {string} [token]
 * @property {typeof globalThis.fetch} [fetch]
 * @property {number} [timeoutMs]
 */
import { toQueryString } from './query.mjs';

export class StrapiError extends Error {
	name = 'StrapiError';
}

/** Strapi's default `api.rest.maxLimit`. */
export const PAGE_SIZE = 100;

/**
 * undici reports a refused connection as `TypeError('fetch failed')` whose
 * cause is an error — or an AggregateError, one per address tried — carrying
 * the useful part: the system error code.
 * @param {unknown} error
 * @param {number} timeoutMs
 * @returns {string}
 */
function describeNetworkError(error, timeoutMs) {
	if (error instanceof Error && error.name === 'TimeoutError') {
		return `pas de réponse en ${timeoutMs / 1000} s`;
	}
	/** @type {unknown} */
	let cause = error instanceof Error && error.cause ? error.cause : error;
	if (cause instanceof AggregateError && cause.errors.length) cause = cause.errors[0];
	if (cause && typeof cause === 'object' && 'code' in cause) return String(cause.code);
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * @param {TransportOptions} options
 * @returns {{ origin: string, request: (path: string, params: QueryParams) => Promise<unknown> }}
 */
export function createTransport({
	baseUrl,
	token,
	// Resolved per call, not captured at creation, so the global can be swapped.
	fetch = (input, init) => globalThis.fetch(input, init),
	timeoutMs = 10_000,
}) {
	const origin = baseUrl.replace(/\/+$/, '');

	/** @param {string} path @param {QueryParams} params */
	async function request(path, params) {
		const query = toQueryString(params);
		const url = `${origin}${path}${query ? `?${query}` : ''}`;
		/** @type {Record<string, string>} */
		const headers = { Accept: 'application/json' };
		if (token) headers.Authorization = `Bearer ${token}`;

		let res;
		try {
			res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
		} catch (cause) {
			throw new StrapiError(
				`Strapi injoignable (GET ${origin}${path}) : ${describeNetworkError(cause, timeoutMs)}.\n` +
					`Vérifie que le CMS tourne sur ${origin} et que STRAPI_URL est correct. ` +
					'Les pages sont prérendues : sans CMS, le build échoue plutôt que de publier un site vide.',
				{ cause },
			);
		}

		if (!res.ok) {
			/** @type {unknown} */
			const body = await res.json().catch(() => null);
			const error = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
			const detail =
				error && typeof error === 'object' && 'message' in error ? error.message : undefined;
			const hint =
				res.status === 401 || res.status === 403
					? ' Vérifie que le rôle Public peut lire ce type de contenu, ou que STRAPI_API_TOKEN est valide.'
					: '';
			throw new StrapiError(
				`Strapi a répondu ${res.status} (${res.statusText || 'erreur'}) pour GET ${url}` +
					`${detail ? ` : ${String(detail)}` : ''}.${hint}`,
			);
		}

		return res.json();
	}

	return { origin, request };
}

/**
 * A response that breaks the contract, naming the first offending fields.
 * @param {string} path
 * @param {ReadonlyArray<{ path: ReadonlyArray<PropertyKey>, message: string }>} issues
 * @returns {StrapiError}
 */
export function contractError(path, issues) {
	const lines = issues
		.slice(0, 5)
		.map((i) => `  - ${i.path.map(String).join('.') || '(racine)'} : ${i.message}`)
		.join('\n');
	return new StrapiError(
		`Réponse Strapi hors contrat pour GET ${path} :\n${lines}\n` +
			'Le contrat est défini par cms-zero ; voir src/types/strapi.ts.',
	);
}

/**
 * Every entry of a paginated collection, page after page.
 * @template T
 * @param {(page: number) => Promise<{ data: T[], meta: { pagination: { pageCount: number } } }>} fetchPage
 * @returns {Promise<T[]>}
 */
export async function collectPages(fetchPage) {
	/** @type {T[]} */
	const all = [];
	for (let page = 1; ; page++) {
		const res = await fetchPage(page);
		all.push(...res.data);
		if (page >= res.meta.pagination.pageCount) return all;
	}
}
