import { describe, expect, it, vi } from 'vitest';
import fixture from '../../../test/fixtures/articles.json';
import { articleDetailDto, articleSummaryDto } from '../../types/strapi';
import { toArticleDetail, toArticleSummary } from './article';

const [analyse, opinion, breve] = fixture.data.map((a) => articleDetailDto.parse(a));

describe('toArticleSummary', () => {
	const summary = toArticleSummary(articleSummaryDto.parse(fixture.data[0]));

	it('maps the listing fields and strips the envelope', () => {
		expect(summary).toMatchObject({
			slug: 'cloud-act-donnees-europeennes',
			title: 'Le Cloud Act et les données européennes : ce que dit vraiment le texte',
			contentType: 'analyse',
			category: { name: 'Souveraineté numérique', slug: 'souverainete' },
			tags: [
				{ name: 'Cloud', slug: 'cloud' },
				{ name: 'Droit', slug: 'droit' },
			],
		});
		expect(summary).not.toHaveProperty('documentId');
	});

	it('parses publishedAt and dateMiseAJour as dates', () => {
		expect(summary.publishedAt).toEqual(new Date('2026-10-12T07:30:00.000Z'));
		expect(summary.updatedAt).toEqual(new Date('2026-10-15T09:00:00.000Z'));
	});

	it('resolves the cover against the CMS origin, keeping the alt text', () => {
		expect(summary.cover).toEqual({
			url: 'http://cms.test/uploads/datacenter_4f2a.jpg',
			alt: 'Allée de serveurs dans un centre de données',
			width: 1600,
			height: 900,
		});
	});

	it('turns nulls into absent fields', () => {
		const s = toArticleSummary(articleSummaryDto.parse(fixture.data[2]));
		expect(s.description).toBeUndefined();
		expect(s.cover).toBeUndefined();
		expect(s.updatedAt).toBeUndefined();
		expect(s.tags).toEqual([]);
	});
});

describe('toArticleDetail', () => {
	const detail = toArticleDetail(analyse);

	it('numbers sources from 1 and maps every field', () => {
		expect(detail.sources).toEqual([
			{
				index: 1,
				title: 'H.R.4943 — CLOUD Act',
				url: 'https://www.congress.gov/bill/115th-congress/house-bill/4943',
				publisher: 'Congrès des États-Unis',
				publishedOn: new Date('2018-03-23'),
				consultedOn: new Date('2026-10-14'),
				level: 'primaire',
			},
			{
				index: 2,
				title: "Analyse d'impact sur l'accès transfrontière aux preuves électroniques",
				url: 'https://commission.europa.eu/e-evidence',
				publisher: 'Commission européenne',
				publishedOn: undefined,
				consultedOn: new Date('2026-10-14'),
				level: 'institutionnelle',
			},
		]);
	});

	it('renders rich text as safe HTML with citation calls linked to the sources', () => {
		const block = detail.blocks[0];
		expect(block.__component).toBe('shared.rich-text');
		if (block.__component !== 'shared.rich-text') return;
		expect(block.html).toContain('<h2>Ce que dit le texte</h2>');
		expect(block.html).toContain('<a href="#source-1"');
		expect(block.html).toContain('<a href="#source-2"');
		expect(block.html).not.toContain('<script');
		expect(block.html).not.toContain('javascript:');
	});

	it('flags a quote titled « Point de vue » as an opinion passage', () => {
		expect(detail.blocks[1]).toMatchObject({
			__component: 'shared.quote',
			title: 'Point de vue',
			isOpinion: true,
		});
	});

	it('recognises « Point de vue » regardless of case and spacing', () => {
		const d = toArticleDetail({
			...analyse,
			blocks: [{ __component: 'shared.quote', title: '  point  de VUE ', body: 'x' }],
		});
		expect(d.blocks[0]).toMatchObject({ isOpinion: true });
	});

	it('does not flag an ordinary quote', () => {
		const d = toArticleDetail({
			...analyse,
			blocks: [{ __component: 'shared.quote', title: 'Thierry Breton', body: 'x' }],
		});
		expect(d.blocks[0]).toMatchObject({ isOpinion: false });
	});

	it('maps media and slider blocks, resolving only relative URLs', () => {
		expect(detail.blocks[2]).toEqual({
			__component: 'shared.media',
			image: {
				url: 'http://cms.test/uploads/schema_9c1d.png',
				alt: 'Schéma des flux de réquisition',
				width: 1200,
				height: 800,
			},
			caption: "Le circuit d'une réquisition",
		});
		expect(detail.blocks[3]).toEqual({
			__component: 'shared.slider',
			images: [{ url: 'https://cdn.example.org/a.jpg', alt: '', width: 800, height: 600 }],
		});
	});

	it('drops blocks the frontend does not know', () => {
		expect(detail.blocks).toHaveLength(4);
	});

	it('renders the erratum and FAQ answers as safe HTML', () => {
		expect(detail.erratum).toContain('<strong>mars 2018</strong>');
		expect(detail.erratum).toContain('href="#source-1"');
		expect(detail.faq).toHaveLength(1);
		expect(detail.faq[0].question).toBe("Le CLOUD Act s'applique-t-il à un hébergeur français ?");
		expect(detail.faq[0].answer).toContain('<em>via</em>');
		expect(detail.faq[0].answerText).toBe(
			"Seulement s'il relève de la juridiction américaine, par exemple via une maison mère.",
		);
	});

	it('parses verifieLe as a date', () => {
		expect(detail.verifiedOn).toEqual(new Date('2026-10-14'));
	});

	it('lets seo override title, description and cover', () => {
		expect(detail.seo).toEqual({
			title: 'Cloud Act : ce que dit vraiment le texte',
			description:
				'Lecture sourcée du CLOUD Act et de sa portée sur les données hébergées en Europe.',
			image: {
				url: 'http://cms.test/uploads/og_cloud_act.png',
				alt: 'Cloud Act',
				width: 1200,
				height: 630,
			},
		});
	});

	it('falls back to title, description and cover when seo is null', () => {
		const d = toArticleDetail(opinion);
		expect(d.seo).toEqual({
			title: "Pourquoi l'administration devrait publier son code par défaut",
			description: 'Le code payé par le public devrait être lisible par le public. Plaidoyer.',
			image: undefined,
		});
	});

	it('warns about a call to a missing source, naming the article', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const d = toArticleDetail(opinion);
		const block = d.blocks[0];
		expect(block.__component === 'shared.rich-text' && block.html).toContain('citation--missing');
		expect(warn).toHaveBeenCalledWith(
			expect.stringMatching(/administration-code-ouvert-par-defaut.*source 4/),
		);
		warn.mockRestore();
	});

	it('copes with an article that has no author, sources, FAQ or erratum', () => {
		const d = toArticleDetail(breve);
		expect(d.author).toBeUndefined();
		expect(d.sources).toEqual([]);
		expect(d.faq).toEqual([]);
		expect(d.erratum).toBeUndefined();
		expect(d.verifiedOn).toBeUndefined();
		expect(d.blocks).toEqual([]);
	});
});
