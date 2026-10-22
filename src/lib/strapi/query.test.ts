import { describe, expect, it } from 'vitest';
import { toQueryString } from './query';

describe('toQueryString', () => {
	it('serialises flat params', () => {
		expect(toQueryString({ locale: 'fr', status: 'published' })).toBe('locale=fr&status=published');
	});

	it('serialises nested objects with bracket notation, as Strapi expects', () => {
		expect(
			toQueryString({
				populate: { seo: { populate: 'shareImage' }, cover: true },
				filters: { category: { slug: { $eq: 'ia' } } },
			}),
		).toBe(
			'populate[seo][populate]=shareImage&populate[cover]=true&filters[category][slug][$eq]=ia',
		);
	});

	it('serialises arrays with indices', () => {
		expect(toQueryString({ sort: ['publishedAt:desc'] })).toBe('sort[0]=publishedAt%3Adesc');
	});

	it('encodes values and skips undefined', () => {
		expect(toQueryString({ q: 'a&b c', skip: undefined, n: 2 })).toBe('q=a%26b%20c&n=2');
	});
});
