import { describe, expect, it } from 'vitest';
import { articleHref, categoryHref, mediaUrl, resolveMediaUrl, tagHref } from './url';

describe('resolveMediaUrl', () => {
	it('prefixes a relative upload path with the CMS origin', () => {
		expect(resolveMediaUrl('/uploads/a.jpg', 'http://localhost:1337')).toBe(
			'http://localhost:1337/uploads/a.jpg',
		);
	});

	it('tolerates a trailing slash on the origin', () => {
		expect(resolveMediaUrl('/uploads/a.jpg', 'http://localhost:1337/')).toBe(
			'http://localhost:1337/uploads/a.jpg',
		);
	});

	it('leaves an absolute URL untouched (object storage provider)', () => {
		expect(resolveMediaUrl('https://cdn.example.org/a.jpg', 'http://localhost:1337')).toBe(
			'https://cdn.example.org/a.jpg',
		);
	});
});

describe('mediaUrl', () => {
	it('uses STRAPI_URL from astro:env', () => {
		expect(mediaUrl('/uploads/a.jpg')).toBe('http://cms.test/uploads/a.jpg');
	});
});

describe('internal hrefs', () => {
	it('builds article, category and tag paths', () => {
		expect(articleHref('cloud-act')).toBe('/blog/cloud-act/');
		expect(categoryHref('ia')).toBe('/categories/ia/');
		expect(tagHref('droit')).toBe('/tags/droit/');
	});
});
