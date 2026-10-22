import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';
import { FIXTURE_ARTICLES } from '../scripts/lib/fixtures.mjs';

const pages = readDistHtml();
const HEADINGS = {
	'open-source': '§01 Open source',
	ia: '§02 IA',
	souverainete: '§03 Souveraineté',
	politique: '§04 Politique',
	geopolitique: '§05 Géopolitique',
};
const EXPECTED_STAMPS = Object.fromEntries(
	FIXTURE_ARTICLES.map(({ slug, category }) => [
		slug,
		{ slug: category.slug, text: HEADINGS[category.slug] },
	]),
);
const articleHtml = (id) => {
	const page = pages.find(({ file }) => file.endsWith(`blog/${id}/index.html`));
	assert.ok(page, id);
	return page.html;
};
const stampsOf = (html) =>
	[...html.matchAll(/<a\b([^>]*\bclass="[^"]*\bstamp\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)].map(
		([, attributes, inner]) => ({
			href: attributes.match(/href="([^"]*)"/)?.[1],
			text: inner.replace(/<[^>]+>/g, '').trim(),
		}),
	);

test('chaque article contient exactement un tampon vers sa rubrique, avec numéro et libellé', () => {
	for (const [id, { slug, text }] of Object.entries(EXPECTED_STAMPS)) {
		assert.deepEqual(stampsOf(articleHtml(id)), [{ href: `/rubriques/${slug}/`, text }], id);
	}
});

const stampCss = () => {
	const html = articleHtml('cloud-act-donnees-europeennes');
	return pageCss(html).replace(/\s+/g, ' ');
};
const ruleBody = (css, selectorPattern) =>
	css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

test('le clip-path est sur le pseudo-élément du tampon, pas sur le lien', () => {
	const css = stampCss();
	assert.match(ruleBody(css, '\\.stamp[^{,]*::?before'), /clip-path:\s*polygon/);
	assert.doesNotMatch(ruleBody(css, '\\.stamp\\[data-astro-cid-[\\w]+\\]'), /clip-path/);
});

test('le texte du tampon est en rouge texte, jamais en --ink-red, sans animation', () => {
	const css = stampCss();
	const rule = ruleBody(css, '\\.stamp\\[data-astro-cid-[\\w]+\\]');
	assert.match(rule, /color:\s*var\(--ink-red-text\)/);
	assert.doesNotMatch(rule, /var\(--ink-red\)/);
	assert.doesNotMatch(rule, /animation|transition/);
});

test('un style :focus-visible est défini pour les liens', () => {
	assert.match(stampCss(), /:focus-visible\s*\{[^}]*outline/);
});

test('le libellé du tampon est en monospace capitales', () => {
	const rule = ruleBody(stampCss(), '\\.stamp\\[data-astro-cid-[\\w]+\\]');
	assert.match(rule, /font-family:\s*var\(--font-mono\)/);
	assert.match(rule, /text-transform:\s*uppercase/);
});

const STAMP_RULE = '\\.stamp\\[data-astro-cid-[\\w]+\\]';
const SIDE_INSET = /^(0|1px|100%|calc\(100% - 1px\))$/;

test('les sommets latéraux du clip-path ne retirent que ~1px : les bords gauche et droit restent visibles', () => {
	const polygon =
		ruleBody(stampCss(), '\\.stamp[^{,]*::?before').match(
			/clip-path:\s*polygon\((.*?)\)\s*(?:;|$)/,
		)?.[1] ?? '';
	const points = polygon.split(/,(?![^(]*\))/).map((point) => point.trim().split(/\s+(?![^(]*\))/));
	const side = points.filter(([, y]) => parseFloat(y) > 10 && parseFloat(y) < 90);
	assert.ok(side.length >= 4, polygon);
	for (const [x] of side) assert.match(x, SIDE_INSET, polygon);
});

test('une marge basse écarte le tampon du texte suivant, pour que l’anneau de focus ne le chevauche pas', () => {
	assert.match(ruleBody(stampCss(), STAMP_RULE), /margin-bottom:\s*[\d.]+r?em/);
});
