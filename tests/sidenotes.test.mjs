import assert from 'node:assert/strict';
import { test } from 'node:test';
import rehypeSidenotes from '../src/lib/rehype-sidenotes.mjs';

const text = (value) => ({ type: 'text', value });
const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const ref = (n, occurrence = 1) =>
	el('sup', {}, [
		el('a', { href: `#user-content-fn-${n}`, id: `user-content-fnref-${n}${occurrence > 1 ? `-${occurrence}` : ''}`, dataFootnoteRef: '' }, [text(String(n))]),
	]);
const backref = (n) => el('a', { href: `#user-content-fnref-${n}`, dataFootnoteBackref: '', ariaLabel: 'Retour au texte' }, [text('↩')]);
const footnotes = (...notes) =>
	el('section', { dataFootnotes: '', className: ['footnotes'] }, [
		el('h2', { id: 'footnote-label' }, [text('Notes')]),
		el('ol', {}, notes.map(({ n, body }) => el('li', { id: `user-content-fn-${n}` }, [el('p', {}, [...body, text(' '), backref(n)])]))),
	]);
const transform = (tree) => {
	rehypeSidenotes()(tree);
	return tree;
};
const BLOCKS = ['p', 'div', 'ol', 'ul', 'li', 'section', 'blockquote', 'h2'];
const find = (node, predicate, found = []) => {
	if (predicate(node)) found.push(node);
	for (const child of node.children ?? []) find(child, predicate, found);
	return found;
};
const isSidenote = (node) => node.type === 'element' && node.properties?.className?.includes('sidenote');

test("la note en marge est insérée juste après le premier appel, sans lien retour", () => {
	const tree = el('root', {}, [
		el('p', {}, [text('Texte'), ref(1), text(' suite')]),
		footnotes({ n: 1, body: [text('Une note')] }),
	]);
	transform(tree);
	const paragraph = tree.children[0];
	assert.equal(paragraph.children[1].tagName, 'sup');
	assert.ok(isSidenote(paragraph.children[2]));
	assert.match(JSON.stringify(paragraph.children[2]), /Une note/);
	assert.equal(find(paragraph.children[2], (n) => n.properties?.dataFootnoteBackref !== undefined).length, 0);
});

test('une seule note en marge est insérée quand la note est appelée deux fois', () => {
	const tree = el('root', {}, [
		el('p', {}, [ref(1), text(' puis '), ref(1, 2)]),
		footnotes({ n: 1, body: [text('Une note')] }),
	]);
	transform(tree);
	assert.equal(find(tree, isSidenote).length, 1);
});

test('un arbre sans note reste inchangé', () => {
	const tree = el('root', {}, [el('p', {}, [text('Rien à signaler')])]);
	const before = structuredClone(tree);
	transform(tree);
	assert.deepEqual(tree, before);
});

test("la copie ne contient aucun élément de bloc, garde ses liens et n'a pas d'id", () => {
	const link = el('a', { href: 'https://example.org/', id: 'dup' }, [text('talk')]);
	const tree = el('root', {}, [
		el('p', {}, [ref(1)]),
		footnotes({ n: 1, body: [text('Voir '), link] }),
	]);
	transform(tree);
	const [sidenote] = find(tree, isSidenote);
	assert.deepEqual(find(sidenote, (n) => BLOCKS.includes(n.tagName)), []);
	const [kept] = find(sidenote, (n) => n.tagName === 'a');
	assert.equal(kept.properties.href, 'https://example.org/');
	assert.equal(kept.properties.id, undefined);
	assert.equal(link.properties.id, 'dup');
});

test("l'appel dans un cite à l'intérieur d'un blockquote reçoit sa note", () => {
	const tree = el('root', {}, [
		el('blockquote', {}, [el('p', {}, [el('cite', {}, [text('Rob Pike'), ref(1)])])]),
		footnotes({ n: 1, body: [text('Source')] }),
	]);
	transform(tree);
	const [cite] = find(tree, (n) => n.tagName === 'cite');
	assert.ok(isSidenote(cite.children[2]));
});

test('les paragraphes multiples de la note sont fusionnés en ligne', () => {
	const section = footnotes({ n: 1, body: [text('Un')] });
	section.children[1].children[0].children.push(el('p', {}, [text('Deux')]));
	const tree = el('root', {}, [el('p', {}, [ref(1)]), section]);
	transform(tree);
	const [sidenote] = find(tree, isSidenote);
	assert.deepEqual(find(sidenote, (n) => n.tagName === 'p'), []);
	assert.match(JSON.stringify(sidenote), /Un.*Deux/);
});
