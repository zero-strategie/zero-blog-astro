import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findZeroJsViolations, listDistFiles } from '../scripts/lib/dist.mjs';

test('signale un attribut onclick dans une balise', () => {
	const violations = findZeroJsViolations('<a href="#" onclick="alert(1)">x</a>');
	assert.ok(violations.length > 0);
});

test('ne signale pas on=1 dans le texte', () => {
	assert.deepEqual(findZeroJsViolations('<p>on=1 et onclick=2</p>'), []);
});

test('signale une balise script', () => {
	assert.ok(findZeroJsViolations('<script>1</script>').length > 0);
});

test('signale un lien javascript:', () => {
	assert.ok(findZeroJsViolations('<a href="javascript:void(0)">x</a>').length > 0);
});

test('le helper de lecture échoue en mentionnant pnpm build si dist/client est absent', () => {
	assert.throws(() => listDistFiles('/chemin/inexistant/dist/client'), /pnpm build/);
});
