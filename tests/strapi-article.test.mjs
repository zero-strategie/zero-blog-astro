// Ce que la couche Strapi (mappers, composants éditoriaux, JSON-LD) produit dans les pages
// construites sur test/fixtures/articles.json. Remplace les tests vitest des mappers et du
// rendu de composants : les modules .ts ne sont pas importables par node:test (AGENTS.md §7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readDistHtml } from '../scripts/lib/dist.mjs';
import { fixtureArticle } from '../scripts/lib/fixtures.mjs';

const pages = readDistHtml();
const pageOf = (slug) => {
	const page = pages.find(({ file }) => file.endsWith(`blog/${slug}/index.html`));
	assert.ok(page, slug);
	return page.html.replaceAll('&#39;', "'").replaceAll('&#x27;', "'");
};
const mainOf = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const sectionOf = (html, className) =>
	html.match(new RegExp(`<(section|aside|ul)\\b[^>]*class="${className}[^"]*"[^>]*>[\\s\\S]*?</\\1>`))?.[0] ?? '';
const meta = (html, attribute, name) => html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`))?.[1];
const jsonLd = (html) =>
	[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, data]) => JSON.parse(data));

const ANALYSE = 'cloud-act-donnees-europeennes';
const OPINION = 'administration-code-ouvert-par-defaut';
const BREVE = 'breve-rapport-ia-generative';
const CABLES = 'cables-sous-marins-routes-internet';

test('les sources sont numérotées depuis 1, avec éditeur, dates et niveau', () => {
	const sources = sectionOf(pageOf(ANALYSE), 'sources');
	const items = [...sources.matchAll(/<li id="source-(\d+)" value="\1"[^>]*>([\s\S]*?)<\/li>/g)];
	assert.deepEqual(items.map(([, n]) => n), ['1', '2']);
	const [first, second] = items.map(([, , body]) => body);
	assert.match(first, /<a href="https:\/\/www\.congress\.gov\/bill\/115th-congress\/house-bill\/4943" rel="noopener noreferrer external"[^>]*>\s*H\.R\.4943 — CLOUD Act\s*<\/a>/);
	assert.match(first, /Congrès des États-Unis/);
	assert.match(first, /Source primaire/);
	assert.match(first, /publié le <time datetime="2018-03-23T00:00:00\.000Z">23 mars 2018<\/time>/);
	assert.match(first, /consulté le <time datetime="2026-10-14T00:00:00\.000Z">14 octobre 2026<\/time>/);
	assert.doesNotMatch(second, /publié le/, 'une source sans date de publication ne l’invente pas');
	assert.match(second, /Source institutionnelle/);
});

test('un article sans source le dit, au lieu de masquer la section', () => {
	const sources = sectionOf(pageOf(BREVE), 'sources');
	assert.match(sources, /Cet article ne cite aucune source\./);
	assert.doesNotMatch(sources, /<ol/);
});

test('un appel vers une source absente est rendu sans lien', () => {
	const html = pageOf(OPINION);
	assert.match(html, /<sup class="citation citation--missing" title="Source 4 introuvable">\[4\]<\/sup>/);
	assert.doesNotMatch(html, /href="#source-4"/);
});

test('le badge nomme le type en français ; « Opinion » est en aplat, avec encadré et filet', () => {
	assert.match(pageOf(ANALYSE), /<span class="badge mono-label"[^>]*>\s*Analyse\s*<\/span>/);
	assert.match(pageOf(CABLES), /<span class="badge mono-label"[^>]*>\s*Décryptage\s*<\/span>/);
	const opinion = pageOf(OPINION);
	assert.match(opinion, /<span class="badge mono-label badge--opinion"[^>]*>\s*Opinion\s*<\/span>/);
	assert.match(opinion, /<p class="opinion-notice" role="note"[^>]*>\s*<strong[^>]*>Opinion\.<\/strong>/);
	assert.match(opinion, /<article class="article--opinion"/);
	for (const slug of [ANALYSE, BREVE, CABLES]) assert.doesNotMatch(mainOf(pageOf(slug)), /badge--opinion|opinion-notice/, slug);
});

test('une citation titrée « Point de vue » est un encadré d’opinion, une citation ordinaire non', () => {
	const pointDeVue = sectionOf(pageOf(ANALYSE), 'point-de-vue');
	assert.match(pointDeVue, /aria-label="Point de vue"/);
	assert.match(pointDeVue, /Ce passage exprime une opinion, pas un constat/);
	assert.match(pointDeVue, /hors de portée du droit américain/);
	const cables = pageOf(CABLES);
	assert.doesNotMatch(cables, /point-de-vue/);
	assert.match(cables, /<figure class="quote"[^>]*><blockquote[^>]*><p>On ne répare pas un câble, on le remonte\.<\/p><\/blockquote><figcaption[^>]*>— Un ingénieur câblier<\/figcaption>/);
});

test('le rectificatif est annoncé et rendu en HTML assaini', () => {
	const erratum = sectionOf(pageOf(ANALYSE), 'erratum');
	assert.match(erratum, /role="note"/);
	assert.match(erratum, />Rectificatif</);
	assert.match(erratum, /<strong>mars 2018<\/strong>/);
	assert.match(erratum, /href="#source-1"/);
	assert.doesNotMatch(pageOf(OPINION), /class="erratum/);
});

test('« Mis à jour le » vient de dateMiseAJour et « Vérifié le » de verifieLe', () => {
	const header = pageOf(ANALYSE).match(/<p class="date"[\s\S]*?<\/p>/)?.[0] ?? '';
	assert.match(header, /Mis à jour le <time datetime="2026-10-15T09:00:00\.000Z">15 octobre 2026<\/time>/);
	assert.match(header, /Vérifié le <time datetime="2026-10-14T00:00:00\.000Z">14 octobre 2026<\/time>/);
	assert.match(header, /Par Rédaction Zero Stratégie/);
	const breve = pageOf(BREVE).match(/<p class="date"[\s\S]*?<\/p>/)?.[0] ?? '';
	assert.doesNotMatch(breve, /Mis à jour|Vérifié|Par /);
});

test('la FAQ affiche questions et réponses rendues, et disparaît quand elle est vide', () => {
	const faq = sectionOf(pageOf(ANALYSE), 'faq');
	assert.match(faq, /<h2 id="faq-titre"[^>]*>Questions fréquentes<\/h2>/);
	assert.match(faq, /<h3[^>]*>Le CLOUD Act s'applique-t-il à un hébergeur français \?<\/h3>/);
	assert.match(faq, /<em>via<\/em>/);
	assert.doesNotMatch(pageOf(OPINION), /class="faq"/);
});

test('les mots-clés mènent à /tags/<slug>/', () => {
	const tags = sectionOf(pageOf(ANALYSE), 'tags');
	assert.match(tags, /aria-label="Mots-clés"/);
	assert.match(tags, /<a href="\/tags\/cloud\/"[^>]*>#Cloud<\/a>/);
	assert.match(tags, /<a href="\/tags\/droit\/"[^>]*>#Droit<\/a>/);
	assert.doesNotMatch(pageOf(BREVE), /class="tags/);
	assert.ok(pages.some(({ file }) => file.endsWith('tags/droit/index.html')));
});

test('média et diaporama : texte alternatif et légende Strapi, URL absolue hors CMS gardée telle quelle', () => {
	const html = pageOf(ANALYSE);
	const figure = html.match(/<figure class="media"[\s\S]*?<\/figure>/)?.[0] ?? '';
	assert.match(figure, /<img src="\/_astro\/schema_9c1d_[^"]+\.webp"[^>]*alt="Schéma des flux de réquisition"/);
	assert.match(figure, /<figcaption[^>]*>Le circuit d'une réquisition<\/figcaption>/);
	const slider = html.match(/<ul class="slider"[\s\S]*?<\/ul>/)?.[0] ?? '';
	assert.match(slider, /<img src="https:\/\/cdn\.example\.org\/a\.jpg"/);
});

test('un bloc inconnu du frontend est ignoré sans casser la page', () => {
	assert.ok(fixtureArticle(ANALYSE).blocks.some(({ __component }) => __component === 'shared.carousel-3d'));
	assert.doesNotMatch(mainOf(pageOf(ANALYSE)), /carousel/);
});

test('seo surcharge titre et description ; sans seo, ce sont ceux de l’article et sa couverture', () => {
	const analyse = pageOf(ANALYSE);
	assert.match(analyse, /<title>Cloud Act : ce que dit vraiment le texte<\/title>/);
	assert.equal(meta(analyse, 'name', 'description'), 'Lecture sourcée du CLOUD Act et de sa portée sur les données hébergées en Europe.');
	const opinion = pageOf(OPINION);
	assert.match(opinion, new RegExp(`<title>${fixtureArticle(OPINION).title}</title>`));
	assert.equal(meta(opinion, 'name', 'description'), fixtureArticle(OPINION).description);
	assert.match(meta(opinion, 'property', 'og:image') ?? '', /^https:\/\/zero-strategie\.dev\/_astro\/registre_3c7d_[^"]+\.jpg$/);
	assert.equal(meta(opinion, 'property', 'og:type'), 'article');
});

test('JSON-LD Article : titre, dates, auteur, rubrique, mots-clés, sources en citations', () => {
	const [article, faq] = jsonLd(pageOf(ANALYSE));
	assert.deepEqual(
		{ ...article, image: undefined },
		{
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: 'Le Cloud Act et les données européennes : ce que dit vraiment le texte',
			description: 'Lecture sourcée du CLOUD Act et de sa portée sur les données hébergées en Europe.',
			inLanguage: 'fr',
			mainEntityOfPage: `https://zero-strategie.dev/blog/${ANALYSE}/`,
			datePublished: '2026-10-12T07:30:00.000Z',
			dateModified: '2026-10-15T09:00:00.000Z',
			author: { '@type': 'Person', name: 'Rédaction Zero Stratégie' },
			publisher: { '@type': 'Organization', name: 'zero-stratégie', url: 'https://zero-strategie.dev/' },
			image: undefined,
			articleSection: 'Souveraineté numérique',
			keywords: 'Cloud, Droit',
			citation: ['https://www.congress.gov/bill/115th-congress/house-bill/4943', 'https://commission.europa.eu/e-evidence'],
		},
	);
	assert.match(article.image, /^https:\/\/zero-strategie\.dev\/_astro\/og_cloud_act_[^"]+\.jpg$/);
	assert.deepEqual(faq, {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: "Le CLOUD Act s'applique-t-il à un hébergeur français ?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Seulement s'il relève de la juridiction américaine, par exemple via une maison mère.",
				},
			},
		],
	});
});

test('JSON-LD : publishedAt sert de dateModified, le site d’auteur par défaut, champs vides omis', () => {
	const [opinion] = jsonLd(pageOf(OPINION));
	assert.equal(opinion.dateModified, '2026-10-16T10:00:00.000Z');
	const breve = jsonLd(pageOf(BREVE));
	assert.equal(breve.length, 1, 'pas de FAQPage sans FAQ');
	assert.deepEqual(breve[0].author, { '@type': 'Organization', name: 'zero-stratégie' });
	for (const key of ['image', 'citation', 'keywords', 'description']) assert.equal(key in breve[0], false, key);
});
