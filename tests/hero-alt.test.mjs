import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const BLOG_DIR = new URL('../src/content/blog/', import.meta.url);
const frontmatterOf = (name) => readFileSync(new URL(name, BLOG_DIR), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
const valueOf = (frontmatter, key) => frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim();

test('chaque article avec heroImage a un heroAlt non vide', () => {
	const names = readdirSync(BLOG_DIR);
	assert.equal(names.length, 5);
	for (const name of names) {
		const frontmatter = frontmatterOf(name);
		assert.ok(valueOf(frontmatter, 'heroImage'), name);
		const alt = valueOf(frontmatter, 'heroAlt')?.replace(/^['"]|['"]$/g, '');
		assert.ok(alt && alt.length > 0, `${name} : heroAlt manquant`);
	}
});

test('le schéma exige heroAlt dès qu’il y a un heroImage', () => {
	const schema = readFileSync(new URL('../src/content.config.ts', import.meta.url), 'utf8');
	assert.match(schema, /heroAlt/);
	assert.match(schema, /\.refine\(/);
});
