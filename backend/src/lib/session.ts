import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Per-request cached session lookup. The (admin) layout AND each admin page
 * both gate on the session (defense in depth — layouts don't re-run on soft
 * navigation), so without cache() every request paid two session DB lookups.
 * React's cache() dedupes within a single request; a new request re-checks.
 */
export const getSession = cache(async () => {
    return auth.api.getSession({ headers: await headers() });
});
