/**
 * Every URL the site builds comes from here: media served by the CMS and
 * internal links. No template writes `/blog/${slug}/` or prefixes an upload
 * path itself (AGENTS.md 4.5).
 */
import { STRAPI_URL } from 'astro:env/server';

const ABSOLUTE = /^https?:\/\//i;

/**
 * The local upload provider returns `/uploads/...` paths; an object-storage
 * provider would return absolute URLs, which are kept as they are.
 */
export function resolveMediaUrl(path: string, origin: string): string {
	if (ABSOLUTE.test(path)) return path;
	return new URL(path, origin.endsWith('/') ? origin : `${origin}/`).href;
}

export const mediaUrl = (path: string): string => resolveMediaUrl(path, STRAPI_URL);

export const HOME_HREF = '/';
export const BLOG_HREF = '/blog/';
export const ABOUT_HREF = '/about/';
export const RSS_HREF = '/rss.xml';

export const articleHref = (slug: string): string => `/blog/${slug}/`;
export const categoryHref = (slug: string): string => `/categories/${slug}/`;
export const tagHref = (slug: string): string => `/tags/${slug}/`;
