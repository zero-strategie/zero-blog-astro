/**
 * The only way CMS Markdown becomes HTML.
 *
 * Raw HTML in the source is never passed through (remark-rehype drops it) and
 * the resulting tree is sanitised with GitHub's schema on top, so a stray
 * `<script>` or `javascript:` link written by an agent cannot reach the page.
 * Citation calls are rewritten *after* sanitising: the markup they produce is
 * ours, not the author's.
 */
import type { Element, ElementContent, Root } from 'hast';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { SafeHtml } from '../types/domain';

/** Agents write citation calls as `[[n]](#source-n)`, n being 1-based. */
const CITATION_HREF = /^#source-(\d+)$/;

export interface CitableSource {
	index: number;
	title: string;
}

export interface RenderOptions {
	/** The article's sources; a call is linked only if its number exists here. */
	sources?: readonly CitableSource[];
	/** Called for every call whose number matches no source. */
	onMissingSource?: (index: number) => void;
}

const text = (value: string): ElementContent => ({ type: 'text', value });

function citation(index: number, source: CitableSource | undefined): Element {
	const label = text(`[${index}]`);
	if (!source) {
		return {
			type: 'element',
			tagName: 'sup',
			properties: { className: ['citation', 'citation--missing'], title: `Source ${index} introuvable` },
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

function rehypeCitations({ sources = [], onMissingSource }: RenderOptions) {
	const byIndex = new Map(sources.map((s) => [s.index, s]));
	return (tree: Root) => {
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'a' || parent === undefined || index === undefined) return;
			const match = CITATION_HREF.exec(String(node.properties.href ?? ''));
			if (!match) return;
			const n = Number(match[1]);
			const source = byIndex.get(n);
			if (!source) onMissingSource?.(n);
			parent.children[index] = citation(n, source);
		});
	};
}

export function renderMarkdown(markdown: string, options: RenderOptions = {}): SafeHtml {
	const html = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeCitations, options)
		.use(rehypeStringify)
		.processSync(markdown)
		.toString();
	return html as SafeHtml;
}
