/**
 * THE ONLY place `fetch()` touches Strapi (AGENTS.md 4.5).
 *
 * Owns the base URL, the Authorization header, the timeout, pagination and
 * error normalisation. Knows nothing about any content type: callers pass the
 * schema the response must satisfy.
 *
 * Every failure throws a `StrapiError` whose message says what to fix. Pages
 * are prerendered, so a throw here fails the build — deliberately: a site
 * built against an unreachable CMS must not ship as a set of empty pages
 * (AGENTS.md 4.8).
 */
import { STRAPI_API_TOKEN, STRAPI_URL } from 'astro:env/server';
import type { z } from 'astro/zod';
import { collectionResponse } from '../../types/strapi';
import { type QueryParams, toQueryString } from './query';

export class StrapiError extends Error {
	override name = 'StrapiError';
}

export interface StrapiClientOptions {
	baseUrl: string;
	token?: string;
	fetch?: typeof globalThis.fetch;
	timeoutMs?: number;
}

/**
 * undici reports a refused connection as `TypeError('fetch failed')` whose
 * cause is an error — or an AggregateError, one per address tried — carrying
 * the useful part: the system error code.
 */
function describeNetworkError(error: unknown, timeoutMs: number): string {
	if (error instanceof Error && error.name === 'TimeoutError') {
		return `pas de réponse en ${timeoutMs / 1000} s`;
	}
	let cause: unknown = error instanceof Error && error.cause ? error.cause : error;
	if (cause instanceof AggregateError && cause.errors.length) cause = cause.errors[0];
	if (cause && typeof cause === 'object' && 'code' in cause) return String(cause.code);
	return cause instanceof Error ? cause.message : String(cause);
}

/** Strapi's default `api.rest.maxLimit`. */
const PAGE_SIZE = 100;

export function createStrapiClient({
	baseUrl,
	token,
	// Resolved per call, not captured at creation, so the global can be swapped.
	fetch = (input, init) => globalThis.fetch(input, init),
	timeoutMs = 10_000,
}: StrapiClientOptions) {
	const origin = baseUrl.replace(/\/+$/, '');

	async function request(path: string, params: QueryParams): Promise<unknown> {
		const query = toQueryString(params);
		const url = `${origin}${path}${query ? `?${query}` : ''}`;
		const headers: Record<string, string> = { Accept: 'application/json' };
		if (token) headers.Authorization = `Bearer ${token}`;

		let res: Response;
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
			const body: unknown = await res.json().catch(() => null);
			const detail =
				body && typeof body === 'object' && 'error' in body
					? (body as { error?: { message?: unknown } }).error?.message
					: undefined;
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

	function validate<T extends z.ZodType>(schema: T, json: unknown, path: string): z.infer<T> {
		const parsed = schema.safeParse(json);
		if (parsed.success) return parsed.data;
		const issues = parsed.error.issues
			.slice(0, 5)
			.map((i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`)
			.join('\n');
		throw new StrapiError(
			`Réponse Strapi hors contrat pour GET ${path} :\n${issues}\n` +
				'Le contrat est défini par cms-zero ; voir src/types/strapi.ts.',
		);
	}

	/** One page of a collection endpoint. */
	async function getCollection<T extends z.ZodType>(path: string, params: QueryParams, item: T) {
		return validate(collectionResponse(item), await request(path, params), path);
	}

	/** Every entry of a collection endpoint, following pagination. */
	async function getAll<T extends z.ZodType>(
		path: string,
		params: QueryParams,
		item: T,
	): Promise<z.infer<T>[]> {
		const all: z.infer<T>[] = [];
		for (let page = 1; ; page++) {
			const res = await getCollection(
				path,
				{ ...params, pagination: { page, pageSize: PAGE_SIZE } },
				item,
			);
			all.push(...res.data);
			if (page >= res.meta.pagination.pageCount) return all;
		}
	}

	return { getCollection, getAll };
}

export const strapi = createStrapiClient({ baseUrl: STRAPI_URL, token: STRAPI_API_TOKEN });
