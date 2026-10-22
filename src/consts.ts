/**
 * Site-wide values. They move to the Strapi `global` single type once the
 * frontend reads it (AGENTS.md 5.6); until then this is their only home.
 */
import type { ContentType, SourceLevel } from './types/domain';

export const SITE_TITLE = 'Zero Stratégie';
export const SITE_DESCRIPTION =
	'Open source, IA, souveraineté et géopolitique du numérique : des articles sourcés pour comprendre qui décide de tes outils et de tes données.';

/** Content locale sent to Strapi on every localised request. */
export const LOCALE = 'fr';
/** `<html lang>` and `inLanguage`. */
export const LANG = 'fr';
export const DATE_LOCALE = 'fr-FR';
export const TIME_ZONE = 'Europe/Paris';

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
