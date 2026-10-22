import { describe, expect, it } from 'vitest';
import fixture from '../../../test/fixtures/articles.json';
import { articleDetailDto } from '../../types/strapi';
import { toArticleDetail } from '../mappers/article';
import { articleJsonLd, faqPageJsonLd, serializeJsonLd } from './json-ld';

const [analyse, opinion, breve] = fixture.data.map((a) => toArticleDetail(articleDetailDto.parse(a)));
const url = new URL('https://zero-strategie.dev/blog/cloud-act-donnees-europeennes/');

describe('articleJsonLd', () => {
	it('describes the article with its sources as citations', () => {
		expect(articleJsonLd(analyse, url)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: 'Le Cloud Act et les données européennes : ce que dit vraiment le texte',
			description: 'Lecture sourcée du CLOUD Act et de sa portée sur les données hébergées en Europe.',
			inLanguage: 'fr',
			mainEntityOfPage: url.href,
			datePublished: '2026-10-12T07:30:00.000Z',
			dateModified: '2026-10-15T09:00:00.000Z',
			author: { '@type': 'Person', name: 'Rédaction Zero Stratégie' },
			publisher: { '@type': 'Organization', name: 'Zero Stratégie', url: 'https://zero-strategie.dev/' },
			image: 'http://cms.test/uploads/og_cloud_act.png',
			articleSection: 'Souveraineté numérique',
			keywords: 'Cloud, Droit',
			citation: [
				'https://www.congress.gov/bill/115th-congress/house-bill/4943',
				'https://commission.europa.eu/e-evidence',
			],
		});
	});

	it('uses publishedAt as dateModified when there is no dateMiseAJour', () => {
		expect(articleJsonLd(opinion, url).dateModified).toBe('2026-10-16T10:00:00.000Z');
	});

	it('falls back to the publication as author and omits empty fields', () => {
		const ld = articleJsonLd(breve, url);
		expect(ld.author).toEqual({ '@type': 'Organization', name: 'Zero Stratégie' });
		expect(ld).not.toHaveProperty('image');
		expect(ld).not.toHaveProperty('citation');
		expect(ld).not.toHaveProperty('keywords');
	});
});

describe('faqPageJsonLd', () => {
	it('lists each question with its answer', () => {
		expect(faqPageJsonLd(analyse.faq)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: [
				{
					'@type': 'Question',
					name: "Le CLOUD Act s'applique-t-il à un hébergeur français ?",
					acceptedAnswer: {
						'@type': 'Answer',
						text: 'Seulement s\'il relève de la juridiction américaine, par exemple via une maison mère.',
					},
				},
			],
		});
	});

	it('returns nothing when there is no FAQ', () => {
		expect(faqPageJsonLd([])).toBeUndefined();
	});
});

describe('serializeJsonLd', () => {
	it('cannot be used to close the surrounding <script> element', () => {
		const out = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
		expect(out).not.toContain('</script');
		expect(JSON.parse(out)).toEqual({ headline: '</script><script>alert(1)</script>' });
	});
});
