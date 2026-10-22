// A stand-in for the Strapi REST API, serving test/fixtures/*.json, so the
// site can be built and inspected without a running CMS:
//
//   pnpm fixtures            # http://localhost:1338
//   STRAPI_URL=http://localhost:1338 pnpm build
//
// It honours only what the repositories use: locale, the category and tag
// slug filters, and pagination. Everything else in the query is ignored —
// this checks the frontend, not Strapi's query engine.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 1338);
const load = (name) =>
	JSON.parse(readFileSync(new URL(`../test/fixtures/${name}.json`, import.meta.url), 'utf8'));

const collections = {
	'/api/articles': load('articles'),
	'/api/categories': load('categories'),
	'/api/tags': load('tags'),
};

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#e5e9f0"/><text x="600" y="330" font-family="sans-serif" font-size="40" text-anchor="middle" fill="#60739f">fixture</text></svg>`;

createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	const q = url.searchParams;
	console.log(req.method, decodeURIComponent(url.pathname + url.search));

	if (url.pathname === '/_health') return res.writeHead(204).end();
	if (url.pathname.startsWith('/uploads/')) {
		return res.writeHead(200, { 'content-type': 'image/svg+xml' }).end(PLACEHOLDER);
	}

	const collection = collections[url.pathname];
	if (!collection) {
		return res
			.writeHead(404, { 'content-type': 'application/json' })
			.end(JSON.stringify({ data: null, error: { status: 404, name: 'NotFoundError', message: 'Not Found' } }));
	}

	let data = collection.data.filter((e) => !q.get('locale') || e.locale === q.get('locale'));
	const category = q.get('filters[category][slug][$eq]');
	if (category) data = data.filter((a) => a.category?.slug === category);
	const tag = q.get('filters[tags][slug][$eq]');
	if (tag) data = data.filter((a) => a.tags?.some((t) => t.slug === tag));

	const page = Number(q.get('pagination[page]') ?? 1);
	const pageSize = Number(q.get('pagination[pageSize]') ?? 25);
	const body = {
		data: data.slice((page - 1) * pageSize, page * pageSize),
		meta: {
			pagination: { page, pageSize, pageCount: Math.max(1, Math.ceil(data.length / pageSize)), total: data.length },
		},
	};
	res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}).listen(PORT, () => console.log(`Fixtures Strapi sur http://localhost:${PORT}`));
