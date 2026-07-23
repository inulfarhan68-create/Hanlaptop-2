import { auth } from "./auth";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { userStoreAccess, stores } from "@/db/schema";
import { eq, inArray, sql, type AnyColumn } from "drizzle-orm";
import { Permission, hasPermission } from "./permissions";
import { subscriptions, plans } from "@/db/schema/saas";
import { hasFeature, type FeatureKey } from "./features";

/** All store ids belonging to an organization (the org's tenant boundary). */
export async function getOrgStoreIds(organizationId: string): Promise<string[]> {
    const rows = await db.select({ id: stores.id }).from(stores).where(eq(stores.organizationId, organizationId));
    return rows.map((r) => r.id);
}

/** The session object Better-Auth returns for an authenticated request. */
export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * The authenticated user. Better-Auth carries a custom global `role`
 * (owner | manager | kasir | teknisi | investor) declared in `auth.ts`.
 */
export type AuthUser = AuthSession["user"] & { role: string };

/**
 * Successful result of an auth guard — the shape every route handler relies on.
 * Guards return this OR a `NextResponse` error, so callers must narrow with
 * `if (result instanceof NextResponse) return result;` before using it.
 */
export interface AuthContext {
    session: AuthSession;
    /** Resolved active store id, or "all" for an owner/platform-admin (all their stores). */
    storeId: string;
    /** The user's role at the resolved store (may differ from the global role). */
    storeRole: string;
    user: AuthUser;
    /** The tenant (organization) this request belongs to. null only for platform_admin. */
    organizationId: string | null;
    /** True for the global SaaS operator (sees across all tenants). */
    isPlatformAdmin: boolean;
    /**
     * Store ids this request may touch — the tenant boundary for `storeId === "all"`.
     * `null` means unrestricted (platform_admin only). For a tenant owner this is every
     * store in their org; for other roles, their granted stores. Use with `storeScope()`.
     */
    accessibleStoreIds: string[] | null;
    /**
     * The active plan for the organization, fetched from the database.
     * Contains the raw plan data (including limits and features JSON).
     */
    plan: typeof plans.$inferSelect | null;
    /** Whether the platform admin is currently impersonating a tenant. */
    isImpersonating?: boolean;
}

/**
 * Checks if the incoming request has a valid session and store access.
 * Expects 'x-store-id' in headers. If missing, attempts to fallback to the user's only store.
 * Returns an {@link AuthContext} if authenticated, or a 401/403 NextResponse if not.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({
            headers: headersList,
        });

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized — please sign in" },
                { status: 401 }
            );
        }

        const requestedStoreId = headersList.get("x-store-id");

        // Lookup user's accessible stores
        const accessibleStores = await db.select().from(userStoreAccess)
            .where(eq(userStoreAccess.userId, session.user.id));

        if (session.user.role !== "owner" && session.user.role !== "platform_admin" && accessibleStores.length === 0) {
            return NextResponse.json(
                { error: "Forbidden — you do not have access to any stores" },
                { status: 403 }
            );
        }

        let targetAccess: { role: string; storeId?: string } | undefined;
        let finalStoreId: string | null | undefined = requestedStoreId;

        if (session.user.role === "owner" || session.user.role === "platform_admin") {
            // Owner (tenant-wide) / platform_admin (global) can address all their stores.
            // A specific requested store is kept; otherwise resolve to the "all" sentinel.
            targetAccess = { role: session.user.role };
            finalStoreId = finalStoreId || "all";
        } else {
            // Non-owners (manager, kasir, investor) must check accessibleStores
            if (finalStoreId === "all" || !finalStoreId) {
                // Fallback to first accessible store
                targetAccess = accessibleStores[0];
                finalStoreId = targetAccess.storeId;
            } else {
                targetAccess = accessibleStores.find(s => s.storeId === finalStoreId);
                if (!targetAccess) {
                    // Fallback to first accessible store
                    targetAccess = accessibleStores[0];
                    finalStoreId = targetAccess.storeId;
                }
            }
        }

        if (!targetAccess) {
            return NextResponse.json(
                { error: "Forbidden — no store access could be resolved" },
                { status: 403 }
            );
        }

        // ── Tenant resolution (Phase 2 isolation core) ──
        const authUser = session.user as AuthUser;
        const isPlatformAdmin = authUser.role === "platform_admin";
        
        // Phase 6 Impersonation: Intercept and override if cookie exists
        let isImpersonating = false;
        let impersonatedOrgId: string | null = null;
        if (isPlatformAdmin) {
            const cookieStore = await cookies();
            const impCookie = cookieStore.get("x-impersonate-org-id");
            if (impCookie?.value) {
                isImpersonating = true;
                impersonatedOrgId = impCookie.value;
            }
        }

        // Prefer the persisted user.organizationId; fall back to the org of the user's
        // first accessible store (keeps pre-backfill / stale sessions working).
        let organizationId: string | null = isImpersonating 
            ? impersonatedOrgId 
            : ((authUser as { organizationId?: string | null }).organizationId ?? null);

        if (!organizationId && !isPlatformAdmin && accessibleStores.length > 0) {
            const [row] = await db.select({ orgId: stores.organizationId })
                .from(stores).where(eq(stores.id, accessibleStores[0].storeId)).limit(1);
            organizationId = row?.orgId ?? null;
        }
        
        // Store-id boundary for the `storeId === "all"` path (see storeScope):
        let accessibleStoreIds: string[] | null;
        if (isPlatformAdmin && !isImpersonating) {
            accessibleStoreIds = null; // unrestricted — global operator
        } else if ((authUser.role === "owner" || isImpersonating) && organizationId) {
            accessibleStoreIds = await getOrgStoreIds(organizationId); // every store in the tenant
        } else {
            accessibleStoreIds = accessibleStores.map((s) => s.storeId);
        }

        // SECURITY (cross-tenant IDOR): the owner branch above keeps the requested
        // `x-store-id` verbatim. Reject a specific store that isn't in the caller's
        // accessible set (e.g. a store id spoofed from another org) by falling back to
        // "all" — which storeScope() then bounds to the org. Fail-closed. (Non-owners
        // were already validated against their granted stores.)
        if (
            finalStoreId && finalStoreId !== "all" &&
            accessibleStoreIds !== null && !accessibleStoreIds.includes(finalStoreId)
        ) {
            finalStoreId = "all";
        }

        let plan: typeof plans.$inferSelect | null = null;
        if (organizationId) {
            // Fetch the active subscription and its plan
            const [activeSub] = await db.select({ plan: plans })
                .from(subscriptions)
                .innerJoin(plans, eq(subscriptions.planKey, plans.key))
                .where(eq(subscriptions.organizationId, organizationId))
                .limit(1);
            
            if (activeSub?.plan) {
                plan = activeSub.plan;
            }
        }

        return {
            session,
            user: session.user as AuthUser,
            storeId: finalStoreId ?? "all",
            storeRole: isImpersonating ? "owner" : (targetAccess.role as AuthUser["role"]),
            organizationId,
            isPlatformAdmin,
            isImpersonating,
            accessibleStoreIds,
            plan
        };
    } catch {
        return NextResponse.json(
            { error: "Unauthorized — invalid session" },
            { status: 401 }
        );
    }
}

/**
 * Checks if the incoming request has a valid session AND the user has the 'owner' role for the store.
 */
export async function requireOwner(): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeRole !== "owner" && authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json(
            { error: "Forbidden — owner access required for this store" },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * Checks if the user is a global owner (role === 'owner').
 * Used for user management and global settings.
 */
export async function requireOwnerOnly(): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json(
            { error: "Forbidden — global owner access required" },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * Checks if the user has owner or manager access for the specific store.
 */
export async function requireOwnerOrManager(): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json(
            { error: "Forbidden — owner or manager access required for this store" },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * Checks if the user has write access (i.e. is not an investor).
 * If the user's role at the store is 'investor', returns a 403 NextResponse, otherwise returns null.
 */
export function requireWriteAccess(authResult: { storeRole: string }) {
    if (authResult.storeRole === "investor") {
        return NextResponse.json(
            { error: "Forbidden — investor role is read-only" },
            { status: 403 }
        );
    }
    return null;
}

/**
 * Checks if the user has report viewing access (owner, manager, or investor).
 * Reject kasir role.
 */
export async function requireReportAccess(): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.storeRole !== "investor" && authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json(
            { error: "Forbidden — report access required for this store" },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * PBAC: Checks if the user has a specific granular permission for the store.
 */
export async function requirePermission(permission: Permission): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    // Only platform_admin bypasses PBAC entirely. Tenant owners get their
    // permissions from RolePermissionsMatrix["owner"] (= all permissions),
    // but they're still tenant-scoped via storeScope() in each query.
    if (authResult.isPlatformAdmin) return authResult;

    const role = authResult.storeRole;
    if (!hasPermission(role, permission)) {
        return NextResponse.json(
            { error: `Forbidden — PBAC Violation: You lack the '${permission}' permission required for this action.` },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * Guard: the request must be the global SaaS operator (`platform_admin`).
 * Used by the platform console (tenant / plan / billing management).
 */
export async function requirePlatformAdmin(): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (!authResult.isPlatformAdmin) {
        return NextResponse.json(
            { error: "Forbidden — platform admin access required" },
            { status: 403 }
        );
    }

    return authResult;
}

/**
 * Tenant-safe store filter — the Phase-2b replacement for the legacy
 * `authResult.storeId !== "all" ? eq(col, storeId) : undefined` pattern that
 * currently leaves the "all" path unbounded (a cross-tenant leak once >1 org exists).
 *
 * Returns a Drizzle WHERE condition scoping `column` to the caller's stores:
 *  - platform_admin (`accessibleStoreIds === null`) → `undefined` (no filter, global)
 *  - no accessible stores → always-false (fail closed — sees nothing)
 *  - otherwise → `inArray(column, accessibleStoreIds)` (their store, or every org store for an owner)
 *
 * Usage: `.where(and(baseCond, storeScope(authResult, table.storeId)))`.
 */
export function storeScope(authResult: Pick<AuthContext, "accessibleStoreIds">, column: AnyColumn) {
    const ids = authResult.accessibleStoreIds;
    if (ids === null) return undefined;       // platform_admin: unrestricted
    if (ids.length === 0) return sql`false`;  // no access: match nothing
    return inArray(column, ids);
}

/**
 * Feature Flag Guard: Checks if the user's organization has a specific feature.
 * Must be called in route handlers to enforce plan limits on the backend.
 */
export async function requireFeature(feature: FeatureKey): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.isPlatformAdmin) return authResult;

    if (!authResult.plan || !hasFeature(authResult.plan, feature)) {
        return NextResponse.json(
            { error: `Payment Required — Your current plan does not support the '${feature}' feature.` },
            { status: 402 }
        );
    }

    return authResult;
}

/**
 * Validates if the organization has reached its plan quota for a specific resource.
 * Returns a NextResponse (402 Payment Required) if the quota is exceeded, otherwise null.
 */
export async function checkQuota(
    authResult: AuthContext,
    resource: "stores" | "users" | "transactions"
): Promise<NextResponse | null> {
    if (authResult.isPlatformAdmin) return null;
    const plan = authResult.plan;
    if (!plan) return null; // Defensive, if no plan found, don't hard block.

    const orgId = authResult.organizationId;
    if (!orgId) return null;

    if (resource === "stores" && plan.maxStores !== null) {
        const [{ count }] = await db.select({ count: sql<number>`count(*)` })
            .from(stores).where(eq(stores.organizationId, orgId));
        if (count >= plan.maxStores) {
            return NextResponse.json(
                { error: `Payment Required — Quota reached. Your plan allows a maximum of ${plan.maxStores} stores.` },
                { status: 402 }
            );
        }
    }

    if (resource === "users" && plan.maxUsers !== null) {
        // Count unique users who have access to any store in this org
        const [{ count }] = await db.select({ count: sql<number>`count(distinct ${userStoreAccess.userId})` })
            .from(userStoreAccess)
            .innerJoin(stores, eq(userStoreAccess.storeId, stores.id))
            .where(eq(stores.organizationId, orgId));
            
        if (count >= plan.maxUsers) {
            return NextResponse.json(
                { error: `Payment Required — Quota reached. Your plan allows a maximum of ${plan.maxUsers} users.` },
                { status: 402 }
            );
        }
    }

    if (resource === "transactions" && plan.maxTransactionsPerMonth !== null) {
        // Let's implement the soft limit warning on the frontend instead, 
        // but if we want a hard block, we can do it here.
        // For Phase 4, we will only do soft limits for transactions, so we skip hard block.
    }

    return null;
}
