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

type Category = (typeof CATEGORIES)[number];
export type CategorySlug = Category['slug'];

export const CATEGORY_BY_SLUG = Object.fromEntries(
	CATEGORIES.map((category) => [category.slug, category]),
) as Record<CategorySlug, Category>;

export const categoryHeading = (slug: CategorySlug): string => {
	const { number, label } = CATEGORY_BY_SLUG[slug];
	return `§${number} ${label}`;
};

export const EMPTY_CATEGORY_MESSAGE = "Rien d'imprimé ici pour l'instant";
export const ARCHIVE_LINK_LABEL = "Parcourir l'archive";
export const categoryDescription = (label: string): string => `Les articles de la rubrique ${label}.`;

export const NAV_LABEL = 'Navigation principale';
export const CATEGORIES_NAV_LABEL = 'Rubriques';
export const LICENSE_PREFIX = 'contenu sous licence';
export const FOOTER_LINKS = [
	{ href: RSS_PATH, label: 'RSS' },
	{ href: SOURCE_URL, label: 'GitHub' },
] as const;

// Manifeste provisoire (Q2), à faire confirmer par le client.
export const MANIFESTO = {
	kicker: 'Manifeste',
	title: 'Publier soi-même, ça reste un acte politique.',
	paragraphs: [
		"Ce carnet est imprimé à la main, sur un serveur qui nous appartient. Pas de plateforme entre vous et nous, pas de pistage, pas de script : du texte, de l'encre, une adresse.",
		"On y parle d'open source, d'intelligence artificielle et de souveraineté numérique, avec une conviction : ce qu'on ne peut pas lire, copier et réparer ne nous appartient pas.",
	],
} as const;
export const FEATURED_LABEL = 'À la une';
export const SUMMARY_LABEL = 'Sommaire';
export const EMPTY_HOME_MESSAGE = "Rien d'imprimé pour l'instant. Revenez au prochain tirage.";

export const UPDATED_ON_LABEL = 'Mis à jour le';
export const readingTimeLabel = (minutes: number): string => `${minutes} min de lecture`;

export const ARCHIVE_TITLE = 'Archive';
export const ARCHIVE_DESCRIPTION = 'Tous les articles publiés, du plus récent au plus ancien.';
export const EMPTY_ARCHIVE_MESSAGE = "Rien d'imprimé pour l'instant. Revenez au prochain tirage.";
