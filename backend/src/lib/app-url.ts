/**
 * Absolute base URL of this deployment, used for canonical/OG/JSON-LD URLs.
 *
 * Resolution order — never hardcode an aspirational domain here. A canonical
 * pointing at a domain that doesn't resolve is worse than no canonical: it
 * tells crawlers the real page lives somewhere dead, which can drop the page
 * from the index entirely.
 *
 *   1. NEXT_PUBLIC_APP_URL          — explicit override; set this once a real
 *                                     custom domain is live (e.g. hanlaptop.id)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain, injected
 *                                     by Vercel; correct for prod deploys
 *   3. VERCEL_URL                   — this specific deployment (previews)
 *   4. http://localhost:3000        — local dev
 *
 * Server-side only (2 and 3 are not NEXT_PUBLIC_), which is fine: metadata and
 * JSON-LD are produced in Server Components.
 */
export function getAppUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_APP_URL;
    if (explicit) return withProtocol(explicit).replace(/\/$/, "");

    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (prod) return withProtocol(prod);

    const deployment = process.env.VERCEL_URL;
    if (deployment) return withProtocol(deployment);

    return "http://localhost:3000";
}

function withProtocol(host: string): string {
    return /^https?:\/\//.test(host) ? host : `https://${host}`;
}
