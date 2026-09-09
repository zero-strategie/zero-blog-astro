import type { APIRoute } from 'astro';

// Rendered on demand because a prerendered endpoint is a static file: it would
// answer 200 with a body from disk even after the server stopped working,
// which is the one thing a health check must never do.
export const prerender = false;

// 204, matching the CMS, so deploy.sh, the container healthcheck, the Ansible
// health gate and CI all assert the same thing.
//
// The path is /health and not /_health as on the CMS: Astro excludes every
// route whose file name starts with an underscore, so `_health.ts` would
// simply never be served.
export const GET: APIRoute = () => new Response(null, { status: 204 });
