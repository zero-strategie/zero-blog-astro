import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageCss, readDistHtml } from '../scripts/lib/dist.mjs';

const pages = readDistHtml();
const article = pages.find(({ file }) => file.endsWith('blog/first-post/index.html'));
const compact = (css) => css.replace(/\s+/g, '');
const css = compact(pageCss(article.html));

test('la barre de lecture est décorative et présente dans les articles, absente de l’accueil', () => {
	assert.match(article.html, /<div class="reading-progress[^"]*"[^>]*aria-hidden="true"/);
	const others = pages.filter(({ file }) => file.endsWith('client/index.html'));
	assert.ok(others.length > 0);
	for (const { html } of others) assert.doesNotMatch(html, /reading-progress/);
});

test('sans support de animation-timeline, la barre est en display:none', () => {
	assert.match(css, /\.reading-progress[^{@]*\{[^}]*display:none/);
});

test('la barre ne s’affiche et ne s’anime que sous @supports (animation-timeline: scroll())', () => {
	const supports = css.match(/@supports\(animation-timeline:scroll\(\)\)\{(.*?\})\}/)?.[1] ?? '';
	assert.match(supports, /\.reading-progress[^{]*\{[^}]*display:block/);
	assert.match(supports, /animation-timeline:scroll\(/);
	assert.match(supports, /background:var\(--ink-red\)/);
});

test('la barre est masquée sous prefers-reduced-motion', () => {
	assert.match(
		css,
		/@media\(prefers-reduced-motion:reduce\)\{[^@]*\.reading-progress[^{]*\{[^}]*display:none/,
	);
});

test('la barre est un filet fin en haut de page, sans JavaScript', () => {
	assert.match(css, /\.reading-progress[^{@]*\{[^}]*position:fixed[^}]*top:0/);
	assert.match(css, /height:(\d+(\.\d+)?)px/);
	assert.doesNotMatch(article.html, /<script/);
});
