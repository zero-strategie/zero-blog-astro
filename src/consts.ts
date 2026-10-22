/**
 * Site-wide values and user-facing strings. They move to the Strapi `global`
 * single type once the frontend reads it (AGENTS.md 5.6); until then this is
 * their only home.
 */
import type { ContentType, SourceLevel } from './types/domain';

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

// Les rubriques sont les catégories Strapi : `slug` doit être celui de la catégorie dans cms-zero.
// Le numéro et le libellé court restent ici, c'est de la mise en page (tampon, navigation).
export const CATEGORIES = [
	{ slug: 'open-source', number: '01', label: 'Open source' },
	{ slug: 'ia', number: '02', label: 'IA' },
	{ slug: 'souverainete', number: '03', label: 'Souveraineté' },
	{ slug: 'politique', number: '04', label: 'Politique' },
	{ slug: 'geopolitique', number: '05', label: 'Géopolitique' },
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

export const isCategorySlug = (slug: string): slug is CategorySlug => Object.hasOwn(CATEGORY_BY_SLUG, slug);

/** La rubrique d'une catégorie Strapi, si elle en est une. */
export const rubriqueOf = (category?: { slug: string }): CategorySlug | undefined =>
	category && isCategorySlug(category.slug) ? category.slug : undefined;

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

// Texte À propos provisoire (Q2), à faire confirmer par le client.
export const ABOUT = {
	title: 'À propos',
	description: 'Qui écrit ce carnet, et pourquoi il est imprimé sur un serveur à soi.',
	paragraphs: [
		"zero-stratégie est un carnet indépendant tenu par un développeur freelance. Il rassemble des notes sur l'open source, l'intelligence artificielle et la souveraineté numérique, écrites pour être lues, discutées et réutilisées.",
		'Le site est volontairement léger : pas de pistage, pas de script, pas de régie publicitaire. Les articles sont publiés sous licence libre, et le code du carnet est ouvert.',
		"Une remarque, une correction, une idée d'article ? Le dépôt source est le meilleur endroit pour écrire.",
	],
	contact: { label: 'Écrire via le dépôt source', href: SOURCE_URL },
} as const;

export const NOT_FOUND = {
	kicker: '404',
	title: 'Page introuvable',
	description: "Cette adresse n'existe pas ou plus.",
	message: "Cette page n'a pas été imprimée, ou elle a été retirée du tirage. Reprenez par l'un des points d'entrée ci-dessous.",
	homeLabel: "Retour à l'accueil",
	categoriesLabel: 'Ou feuilletez une rubrique',
} as const;

/** Content locale sent to Strapi on every localised request. */
export const LOCALE = 'fr';
/** `<html lang>` and `inLanguage`. */
export const LANG = 'fr';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
	actualite: 'Actualité',
	analyse: 'Analyse',
	enquete: 'Enquête',
	explainer: 'Décryptage',
	opinion: 'Opinion',
};

export const SOURCE_LEVEL_LABELS: Record<SourceLevel, string> = {
	primaire: 'Source primaire',
	institutionnelle: 'Source institutionnelle',
	presse: 'Presse',
	secondaire: 'Source secondaire',
	projet: 'Projet',
};

export const ARTICLE_LABELS = {
	by: 'Par',
	verifiedOn: 'Vérifié le',
	opinionNotice:
		"Tu lis un texte d'opinion : il défend le point de vue de son auteur et n'engage que lui. Les faits sur lesquels il s'appuie sont sourcés en fin d'article.",
	opinionQuoteNotice:
		"Ce passage exprime une opinion, pas un constat. Les faits sur lesquels il s'appuie sont sourcés en fin d'article.",
	erratum: 'Rectificatif',
	faq: 'Questions fréquentes',
	sources: 'Sources',
	noSources: 'Cet article ne cite aucune source.',
	publishedOn: 'publié le',
	consultedOn: 'consulté le',
	tags: 'Mots-clés',
	missingSource: (index: number): string => `Source ${index} introuvable`,
	citation: (index: number, title: string): string => `Source ${index} : ${title}`,
} as const;

export const TAG_PAGE = {
	title: (name: string): string => `#${name}`,
	description: (name: string): string => `Les articles marqués « ${name} ».`,
} as const;
