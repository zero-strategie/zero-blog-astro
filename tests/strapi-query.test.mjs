import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	ARTICLE_DETAIL_POPULATE,
	ARTICLE_LIST_FIELDS,
	ARTICLE_LIST_POPULATE,
	articleBaseParams,
} from '../src/lib/strapi/populate.mjs';
import { toQueryString } from '../src/lib/strapi/query.mjs';

test('sérialise des paramètres plats', () => {
	assert.equal(toQueryString({ locale: 'fr', status: 'published' }), 'locale=fr&status=published');
});

test('sérialise les objets imbriqués en notation crochets, comme Strapi l’attend', () => {
	assert.equal(
		toQueryString({
			populate: { seo: { populate: 'shareImage' }, cover: true },
			filters: { category: { slug: { $eq: 'ia' } } },
		}),
		'populate[seo][populate]=shareImage&populate[cover]=true&filters[category][slug][$eq]=ia',
	);
});

test('sérialise les tableaux avec leurs indices', () => {
	assert.equal(toQueryString({ sort: ['publishedAt:desc'] }), 'sort[0]=publishedAt%3Adesc');
});

test('encode les valeurs et ignore undefined', () => {
	assert.equal(toQueryString({ q: 'a&b c', skip: undefined, n: 2 }), 'q=a%26b%20c&n=2');
});

const decoded = (params) => decodeURIComponent(toQueryString(params));

test('une requête d’articles demande la locale fr explicitement, les publiés, du plus récent au plus ancien', () => {
	const query = decoded(articleBaseParams('fr'));
	assert.match(query, /locale=fr/);
	assert.match(query, /status=published/);
	assert.match(query, /sort\[0\]=publishedAt:desc/);
});

test('la liste peuple couverture, catégorie et mots-clés, jamais les blocs ni populate=*', () => {
	const query = decoded({ fields: ARTICLE_LIST_FIELDS, populate: ARTICLE_LIST_POPULATE });
	assert.match(query, /populate\[cover\]\[fields\]\[0\]=url/);
	assert.match(query, /populate\[category\]\[fields\]\[1\]=slug/);
	assert.match(query, /populate\[tags\]\[fields\]\[1\]=slug/);
	assert.doesNotMatch(query, /populate\[blocks\]|populate=\*/);
});

test('la page article peuple les blocs par type, les sources, la FAQ et seo.shareImage', () => {
	const query = decoded({ populate: ARTICLE_DETAIL_POPULATE });
	assert.match(
		query,
		/populate\[blocks\]\[on\]\[shared\.media\]\[populate\]\[file\]\[fields\]\[0\]=url/,
	);
	assert.match(
		query,
		/populate\[blocks\]\[on\]\[shared\.slider\]\[populate\]\[files\]\[fields\]\[0\]=url/,
	);
	assert.match(query, /populate\[sources\]=true/);
	assert.match(query, /populate\[faq\]=true/);
	assert.match(query, /populate\[seo\]\[populate\]\[shareImage\]\[fields\]\[0\]=url/);
	assert.doesNotMatch(query, /populate=\*/);
});
