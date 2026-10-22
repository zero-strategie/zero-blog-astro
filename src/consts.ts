export const SITE_TITLE = 'zero-stratégie';
export const SITE_TAGLINE = 'carnet indépendant — open source, IA, souveraineté';
export const SITE_DESCRIPTION =
	"Carnet indépendant sur l'open source, l'IA et la souveraineté numérique.";
export const DEFAULT_SHARE_IMAGE_PATH = '/og-default.png';

export const NAV_LINKS = [
	{ href: '/', label: 'Accueil' },
	{ href: '/blog/', label: 'Archive' },
	{ href: '/about/', label: 'À propos' },
] as const;

export const SOURCE_URL = 'https://github.com/zero-strategie/zero-blog-astro';
export const RSS_PATH = '/rss.xml';

// Licence provisoire (Q1), à faire confirmer par le client.
export const LICENSE = {
	name: 'CC BY-SA 4.0',
	url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
} as const;
export const SKIP_LINK_LABEL = 'Aller au contenu';
