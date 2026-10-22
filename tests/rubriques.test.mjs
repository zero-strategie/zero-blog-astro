import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const SRC_DIR = new URL('../src/', import.meta.url).pathname;
const sourceFiles = () =>
	readdirSync(SRC_DIR, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name));

const EXPECTED_H1 = {
	projets: '§01 Projets',
	'open-source': '§02 Open source',
	ia: '§03 IA',
	souverainete: '§04 Souveraineté',
	politique: '§05 Politique',
};

test("les gabarits d'URL /blog/${…} et /rubriques/${…} n'existent que dans src/lib/url.ts", () => {
	const offenders = sourceFiles()
		.filter((file) => !file.endsWith('/lib/url.ts'))
		.filter((file) => /[`'"]\/(blog|rubriques)\/\$\{/.test(readFileSync(file, 'utf8')));
	assert.deepEqual(offenders, []);
});

test('rss.xml.js construit ses liens avec src/lib/url', () => {
	assert.match(readFileSync(join(SRC_DIR, 'pages/rss.xml.js'), 'utf8'), /lib\/url/);
});

test('le schéma exige une category tirée de CATEGORIES et les articles en ont une valide', () => {
	assert.match(readFileSync(join(SRC_DIR, 'content.config.ts'), 'utf8'), /category:\s*z\.enum\(CATEGORY_SLUGS\)/);
	const dir = join(SRC_DIR, 'content/blog');
	for (const name of readdirSync(dir)) {
		const category = readFileSync(join(dir, name), 'utf8').match(/^category:\s*'?([\w-]+)'?\s*$/m)?.[1];
		assert.ok(Object.keys(EXPECTED_H1).includes(category), `${name} : ${category}`);
	}
});
