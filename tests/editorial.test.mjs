import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOpinionQuoteTitle } from '../src/lib/editorial.mjs';
import { serializeJsonLd } from '../src/lib/seo/serialize.mjs';

test('« Point de vue » marque une citation comme opinion, quelles que soient casse et espaces', () => {
	for (const title of ['Point de vue', '  point  de VUE ', 'Point de vue :']) {
		assert.equal(isOpinionQuoteTitle(title), true, title);
	}
});

test('une citation ordinaire ou sans titre n’est pas une opinion', () => {
	for (const title of ['Thierry Breton', 'Points de vue croisés', undefined]) {
		assert.equal(isOpinionQuoteTitle(title), false, String(title));
	}
});

test('le JSON-LD sérialisé ne peut pas fermer l’élément <script> qui le porte', () => {
	const out = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
	assert.doesNotMatch(out, /<\/script/);
	assert.deepEqual(JSON.parse(out), { headline: '</script><script>alert(1)</script>' });
});
