/**
 * Every URL the site builds comes from here: media served by the CMS and
 * internal links. No template writes `/blog/${slug}/` or prefixes an upload
 * path itself (AGENTS.md 4.5).
 */
import { STRAPI_URL } from 'astro:env/server';
import { resolveMediaUrl } from './media-url.mjs';

export const mediaUrl = (path: string): string => resolveMediaUrl(path, STRAPI_URL);

export const articleUrl = (slug: string): string => `/blog/${slug}/`;
export const archiveUrl = (): string => '/blog/';
export const categoryUrl = (slug: string): string => `/rubriques/${slug}/`;
export const tagUrl = (slug: string): string => `/tags/${slug}/`;
