/**
 * Règle de contenu : une couverture exige un texte alternatif non vide.
 * @param {{ heroImage?: unknown, heroAlt?: string }} frontmatter
 * @returns {boolean}
 */
export function isHeroAltValid({ heroImage, heroAlt }) {
	if (!heroImage) return true;
	return typeof heroAlt === 'string' && heroAlt.trim().length > 0;
}
