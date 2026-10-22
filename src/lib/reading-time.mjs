const WORDS_PER_MINUTE = 220;
const FENCED_CODE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;

/**
 * Temps de lecture estimé en minutes, au minimum 1. Le code délimité n'est pas compté.
 * @param {string} source Corps Markdown ou MDX de l'article.
 * @returns {number}
 */
export function readingTime(source) {
	const words = source.replace(FENCED_CODE, ' ').split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
