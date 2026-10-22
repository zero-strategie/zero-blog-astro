import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const TESTS_DIR = new URL('./', import.meta.url);
const TS_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"][^'"]+\.ts['"]/;

test("aucun test n'importe de fichier .ts (Node < 22.18 ne sait pas les charger)", () => {
	const offenders = readdirSync(TESTS_DIR)
		.filter((name) => name.endsWith('.mjs') && name !== 'no-ts-import.test.mjs')
		.filter((name) => TS_IMPORT.test(readFileSync(new URL(name, TESTS_DIR), 'utf8')));
	assert.deepEqual(offenders, []);
});
