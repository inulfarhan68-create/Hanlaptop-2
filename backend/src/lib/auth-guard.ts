import { auth } from "./auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { userStoreAccess } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Permission, hasPermission } from "./permissions";

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
    /** Resolved active store id, or "all" for a global owner. */
    storeId: string;
    /** The user's role at the resolved store (may differ from the global role). */
    storeRole: string;
    user: AuthUser;
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

        if (session.user.role !== "owner" && accessibleStores.length === 0) {
            return NextResponse.json(
                { error: "Forbidden — you do not have access to any stores" },
                { status: 403 }
            );
        }

        let targetAccess: { role: string; storeId?: string } | undefined;
        let finalStoreId: string | null | undefined = requestedStoreId;

        if (session.user.role === "owner") {
            // Global owner has access to all stores
            if (finalStoreId === "all" || !finalStoreId) {
                targetAccess = { role: "owner" };
                finalStoreId = finalStoreId || "all";
            } else {
                targetAccess = { role: "owner" };
            }
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

        return {
            session,
            storeId: finalStoreId ?? "all",
            storeRole: targetAccess.role,
            user: session.user as AuthUser, // single boundary assertion for the custom `role` field
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

    if (authResult.storeRole !== "owner" && authResult.user.role !== "owner") {
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

    if (authResult.user.role !== "owner") {
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

    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.user.role !== "owner") {
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

    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.storeRole !== "investor" && authResult.user.role !== "owner") {
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

    // A user might have a global role (authResult.user.role) OR a store-specific role (authResult.storeRole).
    // If global owner, they have all permissions.
    const globalRole = authResult.user.role;
    if (globalRole === "owner") return authResult;

    const role = authResult.storeRole;
    if (!hasPermission(role, permission)) {
        return NextResponse.json(
            { error: `Forbidden — PBAC Violation: You lack the '${permission}' permission required for this action.` },
            { status: 403 }
        );
    }

    return authResult;
}
