/**
 * The only way CMS Markdown becomes HTML.
 *
 * Raw HTML in the source is never passed through (remark-rehype drops it) and
 * the resulting tree is sanitised with GitHub's schema on top, so a stray
 * `<script>` or `javascript:` link written by an agent cannot reach the page.
 * Everything after the sanitiser is markup of ours, not the author's:
 *
 * - citation calls `[[n]](#source-n)` become `<sup class="citation">` links to
 *   the article's numbered sources (`#source-n`), and the first call of each
 *   source gets a margin note (samizdat sidenote) copying that source;
 * - GFM footnotes `[^1]` get their margin copy from rehype-sidenotes;
 * - fenced code is highlighted by Shiki with the `css-variables` theme
 *   (`--astro-code-*` tokens, no inline literal colour).
 *
 * Plain `.mjs` with JSDoc so `node:test` can load it on any Node ≥ 22.12
 * (AGENTS.md §7: no test imports a `.ts` file).
 *
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').ElementContent} HastContent
 * @typedef {import('../types/domain').SafeHtml} SafeHtml
 *
 * @typedef {object} CitableSource
 * @property {number} index 1-based, matching `#source-n`.
 * @property {string} title
 * @property {string} [url]
 * @property {string} [publisher]
 *
 * @typedef {object} RenderOptions
 * @property {readonly CitableSource[]} [sources] The article's sources; a call is linked only if its number exists here.
 * @property {(index: number) => void} [onMissingSource] Called for every call whose number matches no source.
 * @property {Set<number>} [sidenotes] Sources already copied in the margin. Pass the same set for every
 *   block of an article so each source gets one margin note, after its first call. Omit it (erratum,
 *   FAQ) to render calls without margin notes.
 */
import { toString } from 'mdast-util-to-string';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createCssVariablesTheme, createHighlighter } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import rehypeSidenotes from './rehype-sidenotes.mjs';

/** Agents write citation calls as `[[n]](#source-n)`, n being 1-based. */
const CITATION_HREF = /^#source-(\d+)$/;

const CODE_THEME = 'css-variables';
const CODE_LANGS = [
	'bash',
	'css',
	'diff',
	'dockerfile',
	'html',
	'javascript',
	'json',
	'markdown',
	'python',
	'shellscript',
	'sql',
	'toml',
	'typescript',
	'yaml',
];
// Created once per process; afterwards highlighting is synchronous.
const highlighter = await createHighlighter({
	themes: [createCssVariablesTheme({ name: CODE_THEME, variablePrefix: '--astro-code-' })],
	langs: CODE_LANGS,
});

/**
 * GitHub's schema, minus the id prefix: raw HTML is dropped before this step,
 * so the only ids left are the footnote ones remark-rehype has already
 * prefixed with `user-content-` — prefixing them again would break the
 * `#user-content-fn-1` links that point at them.
 */
const SANITIZE_SCHEMA = { ...defaultSchema, clobberPrefix: '' };

/** @param {string} value @returns {HastContent} */
const text = (value) => ({ type: 'text', value });

/**
 * @param {number} index
 * @param {CitableSource | undefined} source
 * @returns {HastElement}
 */
function citation(index, source) {
	const label = text(`[${index}]`);
	if (!source) {
		return {
			type: 'element',
			tagName: 'sup',
			properties: {
				className: ['citation', 'citation--missing'],
				title: `Source ${index} introuvable`,
			},
			children: [label],
		};
	}
	return {
		type: 'element',
		tagName: 'sup',
		properties: { className: ['citation'] },
		children: [
			{
				type: 'element',
				tagName: 'a',
				properties: {
					href: `#source-${index}`,
					ariaLabel: `Source ${index} : ${source.title}`,
					title: source.title,
				},
				children: [label],
			},
		],
	};
}

/**
 * Copie en marge d'une source, sur le modèle des notes de samizdat : purement
 * visuelle (aria-hidden, lien hors tabulation, sans id), la section Sources
 * en fin d'article restant la cible lue par les technologies d'assistance.
 * @param {CitableSource} source
 * @returns {HastElement}
 */
function sourceSidenote(source) {
	/** @type {HastContent[]} */
	const body = source.url
		? [
				{
					type: 'element',
					tagName: 'a',
					properties: { href: source.url, tabIndex: -1 },
					children: [text(source.title)],
				},
			]
		: [text(source.title)];
	if (source.publisher) body.push(text(`, ${source.publisher}`));
	return {
		type: 'element',
		tagName: 'span',
		properties: { className: ['sidenote'], ariaHidden: 'true' },
		children: [
			{
				type: 'element',
				tagName: 'span',
				properties: { className: ['sidenote-number'] },
				children: [text(String(source.index))],
			},
			...body,
		],
	};
}

/** @param {RenderOptions} options */
function rehypeCitations({ sources = [], onMissingSource, sidenotes }) {
	const byIndex = new Map(sources.map((s) => [s.index, s]));
	/** @param {HastRoot} tree */
	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'a' || parent === undefined || index === undefined) return;
			const match = CITATION_HREF.exec(String(node.properties.href ?? ''));
			if (!match) return;
			const n = Number(match[1]);
			const source = byIndex.get(n);
			if (!source) onMissingSource?.(n);
			parent.children[index] = citation(n, source);
			if (source && sidenotes && !sidenotes.has(n)) {
				sidenotes.add(n);
				parent.children.splice(index + 1, 0, sourceSidenote(source));
				return index + 2;
			}
		});
	};
}

/** @param {HastElement} code @returns {string} */
function languageOf(code) {
	const className = /** @type {unknown[]} */ ([code.properties.className ?? []].flat());
	const lang = className.map(String).find((name) => name.startsWith('language-'));
	const name = lang?.slice('language-'.length) ?? 'plaintext';
	return highlighter.getLoadedLanguages().includes(name) ? name : 'plaintext';
}

/** Replaces each `<pre><code>` with Shiki's tree, classed `astro-code` like Astro's own. */
function rehypeHighlight() {
	/** @param {HastRoot} tree */
	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'pre' || parent === undefined || index === undefined) return;
			const [code] = node.children;
			if (code?.type !== 'element' || code.tagName !== 'code') return;
			const lang = languageOf(code);
			const highlighted = highlighter.codeToHast(toString(code).replace(/\n$/, ''), {
				lang,
				theme: CODE_THEME,
				transformers: [
					{
						pre(pre) {
							pre.properties.class = String(pre.properties.class ?? '').replace(/shiki/g, 'astro-code');
							pre.properties.dataLanguage = lang;
						},
					},
				],
			});
			const pre = highlighted.children.find((child) => child.type === 'element');
			if (pre) parent.children[index] = /** @type {HastElement} */ (pre);
			return 'skip';
		});
	};
}

/**
 * @param {string} markdown
 * @param {RenderOptions} [options]
 * @returns {SafeHtml}
 */
export function renderMarkdown(markdown, options = {}) {
	const html = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, {
			footnoteLabel: 'Notes',
			footnoteBackLabel: 'Retour au texte',
			// Par défaut le titre est sr-only ; on le veut visible.
			footnoteLabelProperties: {},
		})
		.use(rehypeSanitize, SANITIZE_SCHEMA)
		.use(rehypeCitations, options)
		.use(rehypeSidenotes)
		.use(rehypeHighlight)
		.use(rehypeStringify)
		.processSync(markdown)
		.toString();
	return /** @type {SafeHtml} */ (html);
}

/**
 * Plain text for places that cannot carry markup (JSON-LD). Raw HTML and
 * citation calls are dropped; the words stay.
 * @param {string} markdown
 * @returns {string}
 */
export function markdownToText(markdown) {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
	visit(tree, (node, index, parent) => {
		const isCitation = node.type === 'link' && CITATION_HREF.test(node.url);
		if ((isCitation || node.type === 'html') && parent && index !== undefined) {
			parent.children.splice(index, 1);
			return index;
		}
	});
	return toString(tree)
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,)])/g, '$1')
		.trim();
}
