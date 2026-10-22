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

export const CATEGORIES = [
	{ slug: 'projets', number: '01', label: 'Projets' },
	{ slug: 'open-source', number: '02', label: 'Open source' },
	{ slug: 'ia', number: '03', label: 'IA' },
	{ slug: 'souverainete', number: '04', label: 'Souveraineté' },
	{ slug: 'politique', number: '05', label: 'Politique' },
] as const;

export const CATEGORY_SLUGS = CATEGORIES.map(({ slug }) => slug) as [
	(typeof CATEGORIES)[number]['slug'],
	...(typeof CATEGORIES)[number]['slug'][],
];

export const EMPTY_CATEGORY_MESSAGE = "Rien d'imprimé ici pour l'instant";

export const NAV_LABEL = 'Navigation principale';
export const LICENSE_PREFIX = 'contenu sous licence';
export const FOOTER_LINKS = [
	{ href: RSS_PATH, label: 'RSS' },
	{ href: SOURCE_URL, label: 'GitHub' },
] as const;
