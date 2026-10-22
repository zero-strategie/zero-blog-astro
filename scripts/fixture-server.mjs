// A stand-in for the Strapi REST API, serving test/fixtures/*.json, so the
// site can be built and inspected without a running CMS:
//
//   pnpm fixtures            # http://localhost:1338
//   STRAPI_URL=http://localhost:1338 pnpm build
//
// `pnpm test` starts it in-process (scripts/build-on-fixtures.mjs).
//
// It honours only what the repositories use: locale, the category and tag
// slug filters, `sort[0]=<field>:asc|desc`, and pagination. Everything else in the query is ignored —
// this checks the frontend, not Strapi's query engine. Uploads are generated
// placeholders, rasterised in the format their extension announces and at the
// size the fixture declares, so astro:assets processes them like real ones.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const load = (name) =>
	JSON.parse(readFileSync(new URL(`../test/fixtures/${name}.json`, import.meta.url), 'utf8'));

const collections = {
	'/api/articles': load('articles'),
	'/api/categories': load('categories'),
	'/api/tags': load('tags'),
};

/** Every media object of the fixtures, by URL, for its declared size. */
function mediaSizes(value, sizes = new Map()) {
	if (Array.isArray(value)) value.forEach((item) => mediaSizes(item, sizes));
	else if (value && typeof value === 'object') {
		if (typeof value.url === 'string' && value.url.startsWith('/uploads/')) {
			sizes.set(value.url, { width: value.width ?? 1200, height: value.height ?? 630 });
		}
		Object.values(value).forEach((item) => mediaSizes(item, sizes));
	}
	return sizes;
}
const SIZES = mediaSizes(Object.values(collections));

const placeholder = ({ width, height }) =>
	Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
			'<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">' +
			'<rect width="40" height="40" fill="#d9d4c7"/><rect width="18" height="40" fill="#8c877b"/></pattern></defs>' +
			`<rect width="${width}" height="${height}" fill="url(#p)"/>` +
			`<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#17161a"/></svg>`,
	);

const FORMATS = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };

async function upload(path) {
	const format = FORMATS[extname(path).toLowerCase()];
	if (!format) return undefined;
	const data = await sharp(placeholder(SIZES.get(path) ?? { width: 1200, height: 630 }))
		.toFormat(format)
		.toBuffer();
	return { data, type: `image/${format}` };
}

function list(collection, q) {
	let data = collection.data.filter((e) => !q.get('locale') || e.locale === q.get('locale'));
	const category = q.get('filters[category][slug][$eq]');
	if (category) data = data.filter((a) => a.category?.slug === category);
	const tag = q.get('filters[tags][slug][$eq]');
	if (tag) data = data.filter((a) => a.tags?.some((t) => t.slug === tag));
	const [field, order] = (q.get('sort[0]') ?? '').split(':');
	if (field) {
		const sign = order === 'desc' ? -1 : 1;
		data = [...data].sort((a, b) => sign * String(a[field]).localeCompare(String(b[field])));
	}

	const page = Number(q.get('pagination[page]') ?? 1);
	const pageSize = Number(q.get('pagination[pageSize]') ?? 25);
	return {
		data: data.slice((page - 1) * pageSize, page * pageSize),
		meta: {
			pagination: {
				page,
				pageSize,
				pageCount: Math.max(1, Math.ceil(data.length / pageSize)),
				total: data.length,
			},
		},
	};
}

const NOT_FOUND = JSON.stringify({
	data: null,
	error: { status: 404, name: 'NotFoundError', message: 'Not Found' },
});

/**
 * @param {{ port?: number, log?: (line: string) => void }} [options]
 * @returns {Promise<import('node:http').Server>}
 */
export function startFixtureServer({ port = 1338, log = console.log } = {}) {
	const server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', `http://localhost:${port}`);
		log(`${req.method} ${decodeURIComponent(url.pathname + url.search)}`);

		if (url.pathname === '/_health') return res.writeHead(204).end();
		if (url.pathname.startsWith('/uploads/')) {
			const image = await upload(url.pathname);
			if (!image) return res.writeHead(404).end();
			return res.writeHead(200, { 'content-type': image.type }).end(image.data);
		}
		const collection = collections[url.pathname];
		if (!collection) {
			return res.writeHead(404, { 'content-type': 'application/json' }).end(NOT_FOUND);
		}
		res
			.writeHead(200, { 'content-type': 'application/json' })
			.end(JSON.stringify(list(collection, url.searchParams)));
	});
	return new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, () => resolve(server));
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const port = Number(process.env.PORT ?? 1338);
	await startFixtureServer({ port });
	console.log(`Fixtures Strapi sur http://localhost:${port}`);
}
