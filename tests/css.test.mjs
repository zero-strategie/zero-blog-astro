import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const MAX_CSS_BYTES = 15 * 1024;
const pages = readDistHtml();
const MAX_REGISTRATION_OFFSET_EM = 0.04;
const compact = (css) => css.replace(/\s+/g, '');

test('pageCss réunit la CSS inline et la CSS liée', () => {
	const html = '<link rel="stylesheet" href="/_astro/a.css"><style>b{}</style>';
	const css = pageCss(html, (href) => (href === '/_astro/a.css' ? 'a{}' : ''));
	assert.equal(css, 'a{}b{}');
});

test('chaque page a de la CSS et reste sous 15 KB', () => {
	assert.ok(pages.length > 0);
	for (const { file, html } of pages) {
		const bytes = Buffer.byteLength(pageCss(html));
		assert.ok(bytes > 0, `${file} : aucune CSS`);
		assert.ok(bytes <= MAX_CSS_BYTES, `${file} : ${bytes} octets > ${MAX_CSS_BYTES}`);
	}
});

for (const { file, html } of pages) {
	const css = compact(pageCss(html));

	test(`${file} : mode sombre et animations neutralisées`, () => {
		assert.match(css, /prefers-color-scheme:dark/);
		assert.match(css, /prefers-reduced-motion:reduce/);
		assert.match(css, /animation-duration:0s/);
		assert.match(css, /transition-duration:0s/);
	});

	test(`${file} : décalage du calage du h1 discret (1 à 2 px)`, () => {
		const [, x, y] = css.match(/(?:^|[};,])h1\{[^}]*text-shadow:(-?[\d.]+)em(-?[\d.]+)em/) ?? [];
		assert.ok(x, 'pas de calage en em sur le h1');
		assert.ok(
			Math.abs(x) <= MAX_REGISTRATION_OFFSET_EM && Math.abs(y) <= MAX_REGISTRATION_OFFSET_EM,
			`${x}em ${y}em`,
		);
	});

	test(`${file} : liens en encre soulignés de rouge`, () => {
		assert.match(css, /(^|[};,])a\{[^}]*color:var\(--ink\)/);
		assert.match(css, /text-decoration-color:var\(--ink-red\)/);
	});

	test(`${file} : trame non fixe et calage réservé aux h1`, () => {
		assert.doesNotMatch(css, /background-attachment:fixed/);
		const shadowed = [...css.matchAll(/([^{}]+)\{[^{}]*text-shadow:/g)].map(
			([, selector]) => selector,
		);
		assert.ok(shadowed.length > 0, 'pas de calage');
		for (const list of shadowed) {
			for (const selector of list.split(','))
				assert.match(selector, /^h1(\[|$)/, `${selector} (dans ${list})`);
		}
	});
}

for (const { file, html } of pages) {
	const css = compact(pageCss(html));

	test(`${file} : transitions de vue natives, coupées sous reduced-motion`, () => {
		assert.match(css, /@view-transition\{navigation:auto\}/);
		assert.match(
			css,
			/@media\(prefers-reduced-motion:reduce\)\{[^@]*@view-transition\{navigation:none\}/,
		);
	});
}
