import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	collectPages,
	contractError,
	createTransport,
	StrapiError,
} from '../src/lib/strapi/http.mjs';

const json = (body, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Faux fetch qui enregistre ses appels et rejoue des réponses (ou des erreurs). */
function fakeFetch(...replies) {
	const calls = [];
	const fetch = async (url, init) => {
		calls.push({ url, init });
		const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
		if (reply instanceof Error) throw reply;
		return typeof reply === 'function' ? reply() : reply;
	};
	return { fetch, calls };
}

test('appelle l’API sous l’origine configurée, sans barre finale doublée', async () => {
	const { fetch, calls } = fakeFetch(() => json({ data: [] }));
	const { request } = createTransport({ baseUrl: 'http://cms.test/', fetch });
	assert.deepEqual(await request('/api/articles', { locale: 'fr' }), { data: [] });
	assert.equal(calls[0].url, 'http://cms.test/api/articles?locale=fr');
});

test('n’envoie le jeton Bearer que s’il est configuré', async () => {
	const { fetch, calls } = fakeFetch(() => json({}));
	await createTransport({ baseUrl: 'http://cms.test', token: 't0k', fetch }).request('/api/x', {});
	await createTransport({ baseUrl: 'http://cms.test', fetch }).request('/api/x', {});
	assert.equal(calls[0].init.headers.Authorization, 'Bearer t0k');
	assert.equal(calls[1].init.headers.Authorization, undefined);
});

test('collectPages parcourt toutes les pages', async () => {
	const pages = [];
	const all = await collectPages(async (page) => {
		pages.push(page);
		return { data: page === 1 ? ['a', 'b'] : ['c'], meta: { pagination: { pageCount: 2 } } };
	});
	assert.deepEqual(all, ['a', 'b', 'c']);
	assert.deepEqual(pages, [1, 2]);
});

test('un CMS injoignable donne une erreur explicite plutôt qu’un échec cryptique', async () => {
	const { fetch } = fakeFetch(new TypeError('fetch failed'));
	await assert.rejects(
		createTransport({ baseUrl: 'http://cms.test', fetch }).request('/api/articles', {}),
		(error) => {
			assert.ok(error instanceof StrapiError);
			assert.match(error.message, /Strapi injoignable.*http:\/\/cms\.test.*STRAPI_URL/s);
			return true;
		},
	);
});

test('remonte le code système qu’undici enfouit dans sa cause', async () => {
	const refused = Object.assign(new Error('connect ECONNREFUSED ::1:1337'), {
		code: 'ECONNREFUSED',
	});
	const { fetch } = fakeFetch(
		new TypeError('fetch failed', { cause: new AggregateError([refused]) }),
	);
	await assert.rejects(
		createTransport({ baseUrl: 'http://cms.test', fetch }).request('/api/articles', {}),
		{ message: /^Strapi injoignable \(GET http:\/\/cms\.test\/api\/articles\) : ECONNREFUSED\./ },
	);
});

test('rapporte le statut HTTP et le message d’erreur Strapi, avec un indice pour 401/403', async () => {
	const { fetch } = fakeFetch(() =>
		json({ data: null, error: { status: 403, name: 'ForbiddenError', message: 'Forbidden' } }, 403),
	);
	await assert.rejects(
		createTransport({ baseUrl: 'http://cms.test', fetch }).request('/api/articles', {}),
		{
			message: /403.*Forbidden.*STRAPI_API_TOKEN/s,
		},
	);
});

test('une réponse hors contrat nomme le champ fautif', () => {
	const error = contractError('/api/articles', [
		{ path: ['data', 0, 'slug'], message: 'Expected string' },
	]);
	assert.ok(error instanceof StrapiError);
	assert.match(error.message, /contrat.*data\.0\.slug : Expected string/s);
});
