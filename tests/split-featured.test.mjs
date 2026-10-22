import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Lecture texte du source : un test ne doit pas importer de .ts (Node < 22.18).
// Le comportement observable (une, ordre, état vide) est prouvé sur dist/client dans home.test.mjs.
const source = readFileSync(new URL('../src/lib/featured.ts', import.meta.url), 'utf8');

test('le sommaire est limité à 20 articles', () => {
	assert.match(source, /export const SUMMARY_LIMIT = 20;/);
	assert.match(source, /older\.slice\(0, SUMMARY_LIMIT\)/);
});

test('splitFeatured trie du plus récent au plus ancien, sur une copie du tableau', () => {
	assert.match(source, /\[\.\.\.posts\]\.sort\(\(a, b\) => b\.data\.pubDate\.valueOf\(\) - a\.data\.pubDate\.valueOf\(\)\)/);
});

test('la une est le premier article trié, le sommaire reprend les suivants', () => {
	assert.match(source, /const \[featured, \.\.\.older\] =/);
	assert.match(source, /return \{ featured, summary:/);
});
