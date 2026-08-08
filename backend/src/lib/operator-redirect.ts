import { cookies } from "next/headers";

/**
 * Is this session the SaaS operator browsing as themselves?
 *
 * `platform_admin` owns no shop, so the tenant pages are not just useless to
 * them — they are misleading. requireAuth gives the operator
 * `accessibleStoreIds = null`, and `storeScope()` then applies no store filter,
 * so a dashboard or stock list rendered for them blends every tenant's rows into
 * one view that belongs to nobody.
 *
 * While impersonating they ARE acting as a tenant, which is the point of that
 * feature, so the tenant pages are exactly right and this returns false.
 */
export async function isOperatorBrowsingAsSelf(
    // `role` is nullable on the session user, so accept that rather than making
    // every call site cast.
    user: { role?: string | null } | undefined
): Promise<boolean> {
    if (user?.role !== "platform_admin") return false;
    const impersonating = Boolean((await cookies()).get("x-impersonate-org-id")?.value);
    return !impersonating;
}
