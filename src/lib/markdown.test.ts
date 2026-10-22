import { describe, expect, it, vi } from 'vitest';
import { markdownToText, renderMarkdown } from './markdown';

const sources = [
	{ index: 1, title: 'H.R.4943 — CLOUD Act' },
	{ index: 2, title: 'Analyse de la Commission' },
];

describe('renderMarkdown', () => {
	it('renders Markdown to HTML', () => {
		expect(renderMarkdown('## Titre\n\nUn *mot*.')).toBe('<h2>Titre</h2>\n<p>Un <em>mot</em>.</p>');
	});

	it('drops raw HTML instead of injecting it', () => {
		const html = renderMarkdown(
			'Avant\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">',
		);
		expect(html).not.toContain('<script');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<img');
	});

	it('strips javascript: links', () => {
		const html = renderMarkdown('[piège](javascript:alert(1))');
		expect(html).not.toContain('javascript:');
	});

	it('keeps ordinary external links', () => {
		expect(renderMarkdown('[texte](https://example.org/a)')).toContain(
			'<a href="https://example.org/a">texte</a>',
		);
	});

	describe('citation calls [[n]](#source-n)', () => {
		it('turns a call into a superscript link to the numbered source', () => {
			const html = renderMarkdown('Un fait [[1]](#source-1).', { sources });
			expect(html).toBe(
				'<p>Un fait <sup class="citation"><a href="#source-1" aria-label="Source 1 : H.R.4943 — CLOUD Act" title="H.R.4943 — CLOUD Act">[1]</a></sup>.</p>',
			);
		});

		it('uses the href as the truth when the visible number disagrees', () => {
			const html = renderMarkdown('Fait [[9]](#source-2).', { sources });
			expect(html).toContain('<a href="#source-2"');
			expect(html).toContain('>[2]</a>');
		});

		it('handles several calls in one paragraph', () => {
			const html = renderMarkdown('A [[1]](#source-1) et B [[2]](#source-2).', { sources });
			expect(html.match(/class="citation"/g)).toHaveLength(2);
		});

		it('flags a call to a source that does not exist, without a dead link', () => {
			const onMissingSource = vi.fn();
			const html = renderMarkdown('Fait [[4]](#source-4).', { sources, onMissingSource });
			expect(html).toContain(
				'<sup class="citation citation--missing" title="Source 4 introuvable">[4]</sup>',
			);
			expect(html).not.toContain('href="#source-4"');
			expect(onMissingSource).toHaveBeenCalledWith(4);
		});

		it('leaves other fragment links alone', () => {
			expect(renderMarkdown('[voir](#faq)')).toBe('<p><a href="#faq">voir</a></p>');
		});
	});
});

describe('markdownToText', () => {
	it('keeps the words, drops the formatting and the citation calls', () => {
		expect(
			markdownToText('Seulement *via* une [maison mère](https://ex.org) [[1]](#source-1).'),
		).toBe('Seulement via une maison mère.');
	});

	it('drops raw HTML tags', () => {
		// Inline tags are separate nodes: the text between them survives, as text.
		const text = markdownToText('Avant <script>alert(1)</script> après');
		expect(text).not.toContain('<');
		expect(text).toBe('Avant alert(1) après');
	});
});
