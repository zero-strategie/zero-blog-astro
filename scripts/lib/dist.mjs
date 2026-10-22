const OPENING_TAG = /<[a-zA-Z][^>]*>/g;
const EVENT_HANDLER_ATTRIBUTE = /\s(on[a-z]+)\s*=/i;

export function findZeroJsViolations(html) {
	const violations = [];
	for (const [tag] of html.matchAll(OPENING_TAG)) {
		const handler = tag.match(EVENT_HANDLER_ATTRIBUTE);
		if (handler) violations.push(`attribut ${handler[1]} dans ${tag}`);
	}
	return violations;
}
