const COMMENT = /\/\*[\s\S]*?\*\//g;
const DARK_BLOCK = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}\s*\}/;
const ROOT_BLOCK = /:root\s*\{([^}]*)\}/;
const CUSTOM_PROPERTY = /(--[\w-]+)\s*:\s*([^;]+);/g;

function declarations(block) {
	return Object.fromEntries(
		[...block.matchAll(CUSTOM_PROPERTY)].map(([, name, value]) => [name, value.trim()]),
	);
}

/** Lit les jetons de `tokens.css` : `:root` pour le clair, le bloc media pour le sombre. */
export function parseTokens(css) {
	const source = css.replace(COMMENT, '');
	const dark = source.match(DARK_BLOCK)?.[1] ?? '';
	const light = source.replace(DARK_BLOCK, '').match(ROOT_BLOCK)?.[1] ?? '';
	return { light: declarations(light), dark: declarations(dark) };
}
