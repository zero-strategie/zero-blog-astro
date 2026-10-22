import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Le site est prérendu dans l'image : une reconstruction déclenchée par une
// publication Strapi a le même code et les mêmes arguments que la précédente.
// Sans argument qui change à chaque run, BuildKit ressert l'étape `pnpm build`
// en cache, et l'article publié n'apparaît jamais.
const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test("le Dockerfile déclare CONTENT_REVISION dans l'étape build, avant pnpm build", () => {
	const etape = dockerfile.slice(dockerfile.indexOf('AS build'));
	const arg = etape.search(/^ARG CONTENT_REVISION\b/m);
	const build = etape.search(/pnpm build/);
	assert.ok(arg !== -1, 'ARG CONTENT_REVISION absent de l’étape build');
	assert.ok(build !== -1 && arg < build, 'ARG CONTENT_REVISION doit précéder pnpm build');
});

test('la CI passe un CONTENT_REVISION propre à chaque run', () => {
	assert.match(ci, /CONTENT_REVISION=\$\{\{\s*github\.run_id\s*\}\}/);
});
