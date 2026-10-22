import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownToText, renderMarkdown } from '../src/lib/markdown.mjs';

const sources = [
	{ index: 1, title: 'H.R.4943 — CLOUD Act', url: 'https://www.congress.gov/x', publisher: 'Congrès' },
	{ index: 2, title: 'Analyse de la Commission' },
];

test('rend le Markdown en HTML', () => {
	assert.equal(renderMarkdown('## Titre\n\nUn *mot*.'), '<h2>Titre</h2>\n<p>Un <em>mot</em>.</p>');
});

test('écarte le HTML brut au lieu de l’injecter', () => {
	const html = renderMarkdown('Avant\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
	assert.doesNotMatch(html, /<script|onerror|<img/);
});

test('retire les liens javascript:', () => {
	assert.doesNotMatch(renderMarkdown('[piège](javascript:alert(1))'), /javascript:/);
});

test('garde les liens externes ordinaires', () => {
	assert.ok(renderMarkdown('[texte](https://example.org/a)').includes('<a href="https://example.org/a">texte</a>'));
});

test('un appel [[n]](#source-n) devient un exposant lié à la source numérotée', () => {
	assert.equal(
		renderMarkdown('Un fait [[1]](#source-1).', { sources }),
		'<p>Un fait <sup class="citation"><a href="#source-1" aria-label="Source 1 : H.R.4943 — CLOUD Act" title="H.R.4943 — CLOUD Act">[1]</a></sup>.</p>',
	);
});

test('le href fait foi quand le numéro affiché diverge', () => {
	const html = renderMarkdown('Fait [[9]](#source-2).', { sources });
	assert.ok(html.includes('<a href="#source-2"') && html.includes('>[2]</a>'));
});

test('plusieurs appels dans un paragraphe', () => {
	const html = renderMarkdown('A [[1]](#source-1) et B [[2]](#source-2).', { sources });
	assert.equal(html.match(/class="citation"/g)?.length, 2);
});

test('un appel vers une source absente est signalé, sans lien mort', () => {
	const missing = [];
	const html = renderMarkdown('Fait [[4]](#source-4).', { sources, onMissingSource: (n) => missing.push(n) });
	assert.ok(html.includes('<sup class="citation citation--missing" title="Source 4 introuvable">[4]</sup>'));
	assert.doesNotMatch(html, /href="#source-4"/);
	assert.deepEqual(missing, [4]);
});

test('les autres liens d’ancre sont laissés tels quels', () => {
	assert.equal(renderMarkdown('[voir](#faq)'), '<p><a href="#faq">voir</a></p>');
});

test('sans ensemble de notes en marge, aucun appel n’ajoute de copie (rectificatif, FAQ)', () => {
	assert.doesNotMatch(renderMarkdown('Fait [[1]](#source-1).', { sources }), /sidenote/);
});

test('avec un ensemble partagé, chaque source a une copie en marge, après son premier appel seulement', () => {
	const sidenotes = new Set();
	const first = renderMarkdown('A [[1]](#source-1) puis [[1]](#source-1).', { sources, sidenotes });
	const second = renderMarkdown('Encore [[1]](#source-1) et [[2]](#source-2).', { sources, sidenotes });
	assert.equal(first.match(/class="sidenote"/g)?.length, 1);
	assert.ok(first.indexOf('class="sidenote"') > first.indexOf('href="#source-1"'));
	assert.ok(first.indexOf('class="sidenote"') < first.lastIndexOf('href="#source-1"'));
	assert.equal(second.match(/class="sidenote"/g)?.length, 1, 'la source 1 a déjà sa note');
	assert.match(second, /<span class="sidenote-number">2<\/span>Analyse de la Commission<\/span>/);
});

test('la copie en marge est décorative : aria-hidden, lien hors tabulation, sans id', () => {
	const html = renderMarkdown('Fait [[1]](#source-1).', { sources, sidenotes: new Set() });
	const sidenote = html.slice(html.indexOf('<span class="sidenote"'), html.indexOf(', Congrès</span>'));
	assert.match(sidenote, /^<span class="sidenote" aria-hidden="true">/);
	assert.match(sidenote, /<a href="https:\/\/www\.congress\.gov\/x" tabindex="-1">H\.R\.4943 — CLOUD Act<\/a>/);
	assert.doesNotMatch(sidenote, /\sid=/);
});

test('une note GFM [^1] garde sa section « Notes » et reçoit sa copie en marge', () => {
	const html = renderMarkdown('Texte[^1].\n\n[^1]: Une note.');
	assert.match(html, /<section data-footnotes[^>]*>\s*<h2 id="footnote-label">Notes<\/h2>/);
	assert.match(html, /href="#user-content-fn-1" id="user-content-fnref-1"/);
	assert.match(html, /<li id="user-content-fn-1">/);
	assert.match(html, /<span class="sidenote" aria-hidden="true"><span class="sidenote-number">1<\/span>[^<]*Une note/);
});

test('le code délimité est coloré en css-variables, sans couleur littérale', () => {
	const html = renderMarkdown('```js\nconst a = 1;\n```');
	assert.match(html, /^<pre class="astro-code css-variables"/);
	assert.match(html, /color:var\(--astro-code-token-keyword\)/);
	assert.doesNotMatch(html, /#[0-9a-f]{3,8}\b|rgb\(/i);
});

test('un langage inconnu retombe en texte brut sans faire échouer le rendu', () => {
	assert.match(renderMarkdown('```brainfuck\n+++\n```'), /data-language="plaintext"/);
});

test('markdownToText garde les mots, retire la mise en forme et les appels de note', () => {
	assert.equal(
		markdownToText('Seulement *via* une [maison mère](https://ex.org) [[1]](#source-1).'),
		'Seulement via une maison mère.',
	);
});

test('markdownToText retire les balises HTML brutes', () => {
	// Les balises en ligne sont des nœuds distincts : le texte entre elles reste, en texte.
	assert.equal(markdownToText('Avant <script>alert(1)</script> après'), 'Avant alert(1) après');
});
