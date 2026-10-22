/**
 * THE ONLY place `fetch()` touches Strapi (AGENTS.md 4.5) — through the
 * transport of `http.mjs`, configured here from `astro:env`.
 *
 * Knows nothing about any content type: callers pass the schema each entry
 * must satisfy, and get domain-free, validated DTOs back.
 */
import { STRAPI_API_TOKEN, STRAPI_URL } from 'astro:env/server';
import type { z } from 'astro/zod';
import { collectionResponse } from '../../types/strapi';
import { collectPages, contractError, createTransport, PAGE_SIZE } from './http.mjs';
import type { QueryParams } from './query.mjs';

export { StrapiError } from './http.mjs';

export function createStrapiClient(options: Parameters<typeof createTransport>[0]) {
	const { request } = createTransport(options);

	function validate<T extends z.ZodType>(schema: T, json: unknown, path: string): z.infer<T> {
		const parsed = schema.safeParse(json);
		if (parsed.success) return parsed.data;
		throw contractError(path, parsed.error.issues);
	}

	/** One page of a collection endpoint. */
	async function getCollection<T extends z.ZodType>(path: string, params: QueryParams, item: T) {
		return validate(collectionResponse(item), await request(path, params), path);
	}

	/** Every entry of a collection endpoint, following pagination. */
	function getAll<T extends z.ZodType>(
		path: string,
		params: QueryParams,
		item: T,
	): Promise<z.infer<T>[]> {
		return collectPages((page) =>
			getCollection(path, { ...params, pagination: { page, pageSize: PAGE_SIZE } }, item),
		);
	}

	return { getCollection, getAll };
}

export const strapi = createStrapiClient({ baseUrl: STRAPI_URL, token: STRAPI_API_TOKEN });
