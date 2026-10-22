// `pnpm build` against the Strapi fixtures, without a CMS: starts
// scripts/fixture-server.mjs on a free port, runs `astro build` with
// STRAPI_URL pointing at it, then stops the server. Used by `pnpm test`, whose
// assertions read dist/client/ and take their expectations from
// test/fixtures/*.json (scripts/lib/fixtures.mjs).
import { spawn } from 'node:child_process';
import { startFixtureServer } from './fixture-server.mjs';

const server = await startFixtureServer({ port: 0, log: () => {} });
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;

const env = { ...process.env, STRAPI_URL: `http://localhost:${port}` };
delete env.STRAPI_API_TOKEN;

const code = await new Promise((resolve) => {
	const child = spawn('pnpm', ['astro', 'build'], { env, stdio: 'inherit' });
	child.on('exit', (status) => resolve(status ?? 1));
});
server.close();
process.exit(code);
