/**
 * @typedef {{ type: string, value?: string, tagName?: string, properties?: Record<string, unknown>, children?: HastNode[] }} HastNode
 */

const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'li', 'blockquote', 'section', 'pre', 'table', 'hr']);
const REF_ID = /^user-content-fn-(.+)$/;

/** @param {HastNode} node */
const isElement = (node) => node.type === 'element';

/** @param {HastNode} node @returns {string} */
const textOf = (node) => node.value ?? (node.children ?? []).map(textOf).join('');

/** @param {HastNode} node @param {(node: HastNode) => boolean} predicate @param {HastNode[]} [found] */
function collect(node, predicate, found = []) {
	if (predicate(node)) found.push(node);
	for (const child of node.children ?? []) collect(child, predicate, found);
	return found;
}

/** @param {HastNode} node */
const isBackref = (node) => isElement(node) && node.properties?.dataFootnoteBackref !== undefined;

/** @param {HastNode} node @returns {string | undefined} Identifiant de note si le nœud est un appel. */
function callId(node) {
	if (!isElement(node) || node.tagName !== 'a' || node.properties?.dataFootnoteRef === undefined) return undefined;
	return REF_ID.exec(String(node.properties.href).replace(/^#/, ''))?.[1];
}

/**
 * Copie en ligne : blocs aplatis, liens retour retirés, ids retirés pour ne pas dupliquer ceux des notes de fin.
 * @param {HastNode[]} nodes @returns {HastNode[]}
 */
function inlineCopy(nodes) {
	return nodes.flatMap((node) => {
		if (isBackref(node)) return [];
		if (!isElement(node)) return [structuredClone(node)];
		const children = inlineCopy(node.children ?? []);
		if (BLOCK_TAGS.has(node.tagName ?? '')) return [{ type: 'text', value: ' ' }, ...children];
		const { id: _id, ...properties } = node.properties ?? {};
		// La copie est aria-hidden : un lien focusable y serait une erreur d'accessibilité (axe aria-hidden-focus).
		const copied = node.tagName === 'a' ? { ...properties, tabIndex: -1 } : properties;
		return [{ ...node, properties: copied, children }];
	});
}

/** @param {HastNode} tree @returns {Map<string, HastNode[]>} */
function noteBodies(tree) {
	const items = collect(tree, (node) => isElement(node) && node.tagName === 'li' && REF_ID.test(String(node.properties?.id ?? '')));
	return new Map(items.map((item) => [String(item.properties?.id).replace('user-content-fn-', ''), item.children ?? []]));
}

/** @param {HastNode} parent @param {Map<string, HastNode[]>} bodies @param {Set<string>} done */
function insertSidenotes(parent, bodies, done) {
	const children = parent.children ?? [];
	for (let index = 0; index < children.length; index += 1) {
		const child = children[index];
		const anchor = isElement(child) && child.tagName === 'sup' ? (child.children ?? []).find((c) => callId(c) !== undefined) : undefined;
		const id = anchor && callId(anchor);
		if (anchor && id && bodies.has(id) && !done.has(id)) {
			done.add(id);
			children.splice(index + 1, 0, sidenote(textOf(anchor), bodies.get(id) ?? []));
			index += 1;
			continue;
		}
		insertSidenotes(child, bodies, done);
	}
}

/** @param {string} number @param {HastNode[]} body @returns {HastNode} */
function sidenote(number, body) {
	return {
		type: 'element',
		tagName: 'span',
		// Copie purement visuelle : la section de notes de fin reste la cible lue par les technologies d'assistance.
		properties: { className: ['sidenote'], ariaHidden: 'true' },
		children: [
			{ type: 'element', tagName: 'span', properties: { className: ['sidenote-number'] }, children: [{ type: 'text', value: number }] },
			...inlineCopy(body),
		],
	};
}

/**
 * Plugin rehype : copie chaque note de bas de page en note en marge, après son premier appel.
 * La section de notes de fin est conservée et reste affichée, la copie en marge est décorative.
 * @returns {(tree: HastNode) => void}
 */
export default function rehypeSidenotes() {
	return (tree) => {
		const bodies = noteBodies(tree);
		if (bodies.size > 0) insertSidenotes(tree, bodies, new Set());
	};
}
