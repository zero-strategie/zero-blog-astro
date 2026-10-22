import { z } from 'astro/zod';
import { describe, expect, it, vi } from 'vitest';
import { createStrapiClient, StrapiError } from './client';

const item = z.object({ slug: z.string() });

const page = (slugs: string[], p: number, pageCount: number) => ({
	data: slugs.map((slug) => ({ slug })),
	meta: { pagination: { page: p, pageSize: slugs.length, pageCount, total: 99 } },
});

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('strapi client', () => {
	it('calls the API under the configured origin and validates the response', async () => {
		const fetch = vi.fn().mockResolvedValue(json(page(['a'], 1, 1)));
		const client = createStrapiClient({ baseUrl: 'http://cms.test/', fetch });

		const res = await client.getCollection('/api/articles', { locale: 'fr' }, item);

		expect(res.data).toEqual([{ slug: 'a' }]);
		expect(fetch.mock.calls[0][0]).toBe('http://cms.test/api/articles?locale=fr');
	});

	it('sends the bearer token only when one is configured', async () => {
		const fetch = vi.fn().mockImplementation(async () => json(page([], 1, 1)));
		await createStrapiClient({ baseUrl: 'http://cms.test', token: 't0k', fetch }).getCollection(
			'/api/x',
			{},
			item,
		);
		await createStrapiClient({ baseUrl: 'http://cms.test', fetch }).getCollection('/api/x', {}, item);

		expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer t0k');
		expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
	});

	it('walks every page', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(json(page(['a', 'b'], 1, 2)))
			.mockResolvedValueOnce(json(page(['c'], 2, 2)));
		const client = createStrapiClient({ baseUrl: 'http://cms.test', fetch });

		const all = await client.getAll('/api/articles', { locale: 'fr' }, item);

		expect(all.map((a) => a.slug)).toEqual(['a', 'b', 'c']);
		expect(fetch.mock.calls[1][0]).toContain('pagination[page]=2');
	});

	it('explains an unreachable CMS instead of failing cryptically', async () => {
		const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
		const client = createStrapiClient({ baseUrl: 'http://cms.test', fetch });

		const call = client.getCollection('/api/articles', {}, item);

		await expect(call).rejects.toBeInstanceOf(StrapiError);
		await expect(call).rejects.toThrow(/Strapi injoignable.*http:\/\/cms\.test.*STRAPI_URL/s);
	});

	it('surfaces the system error code undici buries in its cause', async () => {
		const refused = Object.assign(new Error('connect ECONNREFUSED ::1:1337'), { code: 'ECONNREFUSED' });
		const fetch = vi
			.fn()
			.mockRejectedValue(new TypeError('fetch failed', { cause: new AggregateError([refused]) }));
		const client = createStrapiClient({ baseUrl: 'http://cms.test', fetch });

		await expect(client.getCollection('/api/articles', {}, item)).rejects.toThrow(
			'Strapi injoignable (GET http://cms.test/api/articles) : ECONNREFUSED.',
		);
	});

	it('reports the HTTP status and the Strapi error message', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json({ data: null, error: { status: 403, name: 'ForbiddenError', message: 'Forbidden' } }, 403),
			);
		const client = createStrapiClient({ baseUrl: 'http://cms.test', fetch });

		await expect(client.getCollection('/api/articles', {}, item)).rejects.toThrow(
			/403.*Forbidden.*STRAPI_API_TOKEN/s,
		);
	});

	it('names the offending field when the response breaks the contract', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json({ data: [{ slug: 42 }], meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } } }),
			);
		const client = createStrapiClient({ baseUrl: 'http://cms.test', fetch });

		await expect(client.getCollection('/api/articles', {}, item)).rejects.toThrow(
			/contrat.*data\.0\.slug/s,
		);
	});
});
