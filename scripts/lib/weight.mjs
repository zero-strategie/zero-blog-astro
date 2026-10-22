import { readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { findZeroJsViolations, listDistFiles, pageCss, readDistHtml } from './dist.mjs';

const KB = 1024;
export const BUDGETS = {
	cssBytes: 15 * KB,
	homeBytes: 100 * KB,
	fontBytes: 50 * KB,
	fontCount: 1,
};

const FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.otf', '.eot'];
const SCRIPT_EXTENSIONS = ['.js', '.mjs'];
const STYLESHEET_LINK = /<link\b[^>]*\brel="stylesheet"[^>]*>/g;
const HREF = /\bhref="(\/[^"]+)"/;
const FONT_URL = /url\(["']?(\/[^"')]+\.(?:woff2?|ttf|otf|eot))/g;

const byteLength = (text) => Buffer.byteLength(text);
const gzipLength = (text) => gzipSync(text).length;

function linkedStylesheets(html) {
	return [...html.matchAll(STYLESHEET_LINK)].map(([tag]) => tag.match(HREF)?.[1]).filter(Boolean);
}

/** Poids de l'accueil hors images : HTML (CSS inline comprise), feuilles liées et fontes qu'elles chargent. */
function homeContent(html, distDir) {
	const stylesheets = linkedStylesheets(html).map((href) =>
		readFileSync(join(distDir, href), 'utf8'),
	);
	const fontPaths = new Set(
		[html, ...stylesheets].flatMap((css) => [...css.matchAll(FONT_URL)].map(([, path]) => path)),
	);
	const fonts = [...fontPaths].map((path) => readFileSync(join(distDir, path)));
	return {
		text: [html, ...stylesheets].join(''),
		binaryBytes: fonts.reduce((sum, f) => sum + f.length, 0),
	};
}

function analyzePage({ file, html }, distDir) {
	const css = pageCss(html, (href) => readFileSync(join(distDir, href), 'utf8'));
	return {
		path: relative(distDir, file),
		cssBytes: byteLength(css),
		cssGzipBytes: gzipLength(css),
		html,
	};
}

function cssViolations(pages) {
	return pages
		.filter((page) => page.cssBytes > BUDGETS.cssBytes)
		.map((page) => ({
			rule: 'css-15kb',
			detail: `${page.path} : ${page.cssBytes} octets de CSS (liée + inline), budget ${BUDGETS.cssBytes}`,
		}));
}

function fontViolations(distDir, files) {
	const fonts = files.filter((file) => FONT_EXTENSIONS.includes(extname(file)));
	const violations = [];
	if (fonts.length > BUDGETS.fontCount) {
		violations.push({
			rule: 'une-webfont',
			detail: `${fonts.length} fontes : ${fonts.map((f) => relative(distDir, f)).join(', ')}`,
		});
	}
	for (const font of fonts) {
		const size = readFileSync(font).length;
		if (size > BUDGETS.fontBytes) {
			violations.push({
				rule: 'font-50kb',
				detail: `${relative(distDir, font)} : ${size} octets, budget ${BUDGETS.fontBytes}`,
			});
		}
	}
	return violations;
}

function scriptViolations(distDir, pages, files) {
	const inHtml = pages.flatMap((page) =>
		findZeroJsViolations(page.html).map((detail) => ({
			rule: 'zero-js',
			detail: `${page.path} : ${detail}`,
		})),
	);
	const scriptFiles = files
		.filter((file) => SCRIPT_EXTENSIONS.includes(extname(file)))
		.map((file) => ({ rule: 'zero-js', detail: `${relative(distDir, file)} : fichier script` }));
	return [...inHtml, ...scriptFiles];
}

/** Analyse un répertoire de build et renvoie le poids par page, celui de l'accueil et les violations de budget. */
export function checkWeight(distDir) {
	const files = listDistFiles(distDir);
	const pages = readDistHtml(distDir).map((page) => analyzePage(page, distDir));
	const homePage = pages.find((page) => page.path === 'index.html');
	const home = homePage ? homeWeight(homePage, distDir) : undefined;
	const violations = [
		...cssViolations(pages),
		...(home && home.totalBytes > BUDGETS.homeBytes
			? [
					{
						rule: 'home-100kb',
						detail: `accueil : ${home.totalBytes} octets hors images, budget ${BUDGETS.homeBytes}`,
					},
				]
			: []),
		...fontViolations(distDir, files),
		...scriptViolations(distDir, pages, files),
	];
	return { pages: pages.map(({ html, ...page }) => page), home, violations };
}

function homeWeight(homePage, distDir) {
	const { text, binaryBytes } = homeContent(homePage.html, distDir);
	return {
		totalBytes: byteLength(text) + binaryBytes,
		totalGzipBytes: gzipLength(text) + binaryBytes,
	};
}
