const MIN_RATIO = { text: 4.5, large: 3 };
const HEX_COLOR = /^#([0-9a-f]{6})$/i;

function channelLuminance(value) {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
	const match = hex.match(HEX_COLOR);
	if (!match) throw new Error(`Couleur hexadécimale à 6 chiffres attendue : ${hex}`);
	const [red, green, blue] = [0, 2, 4].map((start) =>
		channelLuminance(parseInt(match[1].slice(start, start + 2), 16)),
	);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground, background) {
	const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (lighter + 0.05) / (darker + 0.05);
}

/** @param {'text' | 'large'} kind texte courant (4,5:1) ou grand texte et composant graphique (3:1) */
export function meetsWcag(foreground, background, kind) {
	return contrastRatio(foreground, background) >= MIN_RATIO[kind];
}
