const OPENING_TAG = /<[a-zA-Z][^>]*>/g;
const EVENT_HANDLER_ATTRIBUTE = /\s(on[a-z]+)\s*=/i;
const SCRIPT_TAG = /<script/i;
const JAVASCRIPT_URL = /javascript:/i;

export function findZeroJsViolations(html) {
	const violations = [];
	if (SCRIPT_TAG.test(html)) violations.push('balise <script');
	if (JAVASCRIPT_URL.test(html)) violations.push('URL javascript:');
	for (const [tag] of html.matchAll(OPENING_TAG)) {
		const handler = tag.match(EVENT_HANDLER_ATTRIBUTE);
		if (handler) violations.push(`attribut ${handler[1]} dans ${tag}`);
	}
	return violations;
}
