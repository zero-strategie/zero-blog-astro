import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIST_DIR = fileURLToPath(new URL('../../dist/client', import.meta.url));

const OPENING_TAG = /<[a-zA-Z][^>]*>/g;
const EVENT_HANDLER_ATTRIBUTE = /\s(on[a-z]+)\s*=/i;
const SCRIPT_TAG = /<script/i;
const JAVASCRIPT_URL = /javascript:/i;

export function findZeroJsViolations(html) {
	const violations = [];
	if (SCRIPT_TAG.test(html)) violations.push('balise <script');
	if (JAVASCRIPT_URL.test(html)) violations.push('URL javascript:');
	for (const [tag] of html.matchAll(OPENING_TAG)) {
		const handler = tag.match(EVENT_HANDLER_ATTRIBUTE);
		if (handler) violations.push(`attribut ${handler[1]} dans ${tag}`);
	}
	return violations;
}

export function listDistFiles(distDir = DIST_DIR) {
	if (!existsSync(distDir)) {
		throw new Error(`${distDir} est introuvable : lancez d'abord \`pnpm build\`.`);
	}
	return readdirSync(distDir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name));
}

export function readDistHtml(distDir = DIST_DIR) {
	return listDistFiles(distDir)
		.filter((file) => file.endsWith('.html'))
		.map((file) => ({ file, html: readFileSync(file, 'utf8') }));
}

const STYLESHEET_LINK = /<link\b[^>]*\brel="stylesheet"[^>]*>/g;
const HREF = /\bhref="([^"]+)"/;
const INLINE_STYLE = /<style[^>]*>([\s\S]*?)<\/style>/g;

function readLocalStylesheet(href) {
	return readFileSync(join(DIST_DIR, href), 'utf8');
}

/** CSS qui pèse sur une page : feuilles liées, puis blocs `<style>` inline. */
export function pageCss(html, readStylesheet = readLocalStylesheet) {
	const linked = [...html.matchAll(STYLESHEET_LINK)]
		.map(([tag]) => tag.match(HREF)?.[1])
		.filter((href) => href?.startsWith('/'))
		.map(readStylesheet);
	const inline = [...html.matchAll(INLINE_STYLE)].map(([, css]) => css);
	return [...linked, ...inline].join('');
}
