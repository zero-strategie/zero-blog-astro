/**
 * JSON safe to inline in a `<script type="application/ld+json">`: `<` is
 * escaped so `</script>` cannot appear and close the element early.
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export const serializeJsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
