const COMMENT = /\/\*[\s\S]*?\*\//g;
// Une déclaration finit par `;` ou `}` : un sélecteur comme `#add {` n'est donc jamais lu.
const DECLARATION_VALUE = /[\w-]+\s*:\s*([^;{}]+)(?=[;}])/g;
const LITERAL_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|hwb|lab|lch|oklab|oklch)a?\(/gi;
const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;

export function findLiteralColors(css) {
	const values = [...css.replace(COMMENT, '').matchAll(DECLARATION_VALUE)];
	return values.flatMap(([, value]) => value.match(LITERAL_COLOR) ?? []);
}

export function styleSources(astroSource) {
	return [...astroSource.matchAll(STYLE_BLOCK)].map(([, css]) => css);
}
