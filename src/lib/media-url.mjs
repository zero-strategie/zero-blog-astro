const ABSOLUTE = /^https?:\/\//i;

/**
 * Le fournisseur d'upload local de Strapi renvoie des chemins `/uploads/...` ;
 * un stockage objet renverrait des URL absolues, gardées telles quelles.
 * @param {string} path Chemin ou URL renvoyé par Strapi.
 * @param {string} origin Origine du CMS (STRAPI_URL).
 * @returns {string}
 */
export function resolveMediaUrl(path, origin) {
	if (ABSOLUTE.test(path)) return path;
	return new URL(path, origin.endsWith('/') ? origin : `${origin}/`).href;
}
