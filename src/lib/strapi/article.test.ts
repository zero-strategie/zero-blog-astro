import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../test/fixtures/articles.json';
import { getArticleDetails, getArticles, getArticlesByCategory, getArticlesByTag } from './article';

const respond = () =>
	vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));

const calledUrl = (fetch: ReturnType<typeof respond>) =>
	decodeURIComponent(String((fetch.mock.calls[0] as unknown[])[0]));

afterEach(() => vi.unstubAllGlobals());

describe('article repository', () => {
	it('asks for published French articles, newest first, with the list populate', async () => {
		const fetch = respond();
		vi.stubGlobal('fetch', fetch);

		const articles = await getArticles();

		const url = calledUrl(fetch);
		expect(url).toMatch(/^http:\/\/cms\.test\/api\/articles\?/);
		expect(url).toContain('locale=fr');
		expect(url).toContain('status=published');
		expect(url).toContain('sort[0]=publishedAt:desc');
		expect(url).toContain('populate[cover][fields][0]=url');
		expect(url).not.toContain('populate=*');
		expect(url).not.toContain('populate[blocks]');
		expect(articles.map((a) => a.slug)).toContain('cloud-act-donnees-europeennes');
	});

	it('lets Strapi filter by category and by tag', async () => {
		const fetch = respond();
		vi.stubGlobal('fetch', fetch);
		await getArticlesByCategory('ia');
		await getArticlesByTag('droit');

		expect(decodeURIComponent(String(fetch.mock.calls[0][0]))).toContain(
			'filters[category][slug][$eq]=ia',
		);
		expect(decodeURIComponent(String(fetch.mock.calls[1][0]))).toContain(
			'filters[tags][slug][$eq]=droit',
		);
	});

	it('populates blocks per type, sources, faq and seo.shareImage for the article page', async () => {
		const fetch = respond();
		vi.stubGlobal('fetch', fetch);

		const [first] = await getArticleDetails();

		const url = calledUrl(fetch);
		expect(url).toContain('populate[blocks][on][shared.media][populate][file][fields][0]=url');
		expect(url).toContain('populate[sources]=true');
		expect(url).toContain('populate[faq]=true');
		expect(url).toContain('populate[seo][populate][shareImage][fields][0]=url');
		expect(first.sources).toHaveLength(2);
	});
});
