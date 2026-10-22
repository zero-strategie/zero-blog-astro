import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import type { QuoteBlock, SafeHtml, Source } from '../types/domain';
import Quote from './blocks/Quote.astro';
import ContentTypeBadge from './ContentTypeBadge.astro';
import Erratum from './Erratum.astro';
import Sources from './Sources.astro';

let container: AstroContainer;
beforeAll(async () => {
	container = await AstroContainer.create();
});

type Component = Parameters<AstroContainer['renderToString']>[0];

/** Rendered HTML without the source-location attributes Vite adds in dev. */
const render = async (component: Component, props: object) =>
	(await container.renderToString(component, { props: { ...props } })).replace(
		/ data-astro-source-(file|loc)="[^"]*"/g,
		'',
	);

const sources: Source[] = [
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
		title: 'Note sans éditeur',
		url: 'https://example.org/note',
		consultedOn: new Date('2026-10-14'),
	},
];

describe('Sources', () => {
	it('renders a numbered list whose items are the citation anchors', async () => {
		const html = await render(Sources, { sources });
		expect(html).toContain('<h2 id="sources-titre"');
		expect(html).toMatch(/<ol[^>]*>/);
		expect(html).toContain('id="source-1"');
		expect(html).toContain('id="source-2"');
	});

	it('shows the publisher, both dates and the level', async () => {
		const html = await render(Sources, { sources });
		expect(html).toContain('href="https://www.congress.gov/bill/115th-congress/house-bill/4943"');
		expect(html).toContain('Congrès des États-Unis');
		expect(html).toContain('publié le <time datetime="2018-03-23T00:00:00.000Z">23 mars 2018</time>');
		expect(html).toContain('consulté le <time datetime="2026-10-14T00:00:00.000Z">14 octobre 2026</time>');
		expect(html).toContain('Source primaire');
	});

	it('omits what a source does not have', async () => {
		const html = await render(Sources, { sources: [sources[1]] });
		expect(html).not.toContain('publié le');
		expect(html).not.toContain('class="source-niveau');
	});

	it('opens external links safely', async () => {
		const html = await render(Sources, { sources });
		expect(html).toContain('rel="noopener noreferrer external"');
	});

	it('says so when an article cites no source, rather than hiding the section', async () => {
		const html = await render(Sources, { sources: [] });
		expect(html).toContain('Sources');
		expect(html).toContain("Cet article ne cite aucune source.");
		expect(html).not.toContain('<ol');
	});
});

describe('ContentTypeBadge', () => {
	it('labels the content type in French', async () => {
		const html = await render(ContentTypeBadge, { type: 'enquete' });
		expect(html).toContain('Enquête');
		expect(html).not.toContain('badge--opinion');
	});

	it('makes an opinion unmistakable', async () => {
		const html = await render(ContentTypeBadge, { type: 'opinion' });
		expect(html).toContain('badge--opinion');
		expect(html).toContain('Opinion');
	});
});

describe('Quote', () => {
	const block = (over: Partial<QuoteBlock>): QuoteBlock => ({
		__component: 'shared.quote',
		title: 'Point de vue',
		html: '<p>Un avis.</p>' as SafeHtml,
		isOpinion: true,
		...over,
	});

	it('marks a « Point de vue » passage as opinion', async () => {
		const html = await render(Quote, block({}));
		expect(html).toContain('quote--opinion');
		expect(html).toContain('Point de vue');
		expect(html).toContain('<p>Un avis.</p>');
	});

	it('renders an ordinary quote without the opinion styling', async () => {
		const html = await render(Quote, block({ title: 'Thierry Breton', isOpinion: false }));
		expect(html).not.toContain('quote--opinion');
		expect(html).toContain('Thierry Breton');
	});
});

describe('Erratum', () => {
	it('announces the correction', async () => {
		const html = await render(Erratum, { html: '<p>Date corrigée.</p>' as SafeHtml });
		expect(html).toContain('Rectificatif');
		expect(html).toContain('<p>Date corrigée.</p>');
		expect(html).toContain('role="note"');
	});
});
