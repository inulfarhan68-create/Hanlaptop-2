"use client";

import { createContext, useContext } from "react";

type SessionUser = Record<string, any>;

const SessionUserContext = createContext<SessionUser | null>(null);

/**
 * Seeds the signed-in user into React context from the server session that the
 * (admin) layout already fetched via getSession(). Shell components then read it
 * synchronously instead of calling better-auth's client useSession().
 */
export function SessionUserProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionUserContext.Provider value={user ?? null}>
      {children}
    </SessionUserContext.Provider>
  );
}

/**
 * Drop-in replacement for better-auth's useSession() inside the (admin) shell.
 *
 * Why it exists: better-auth's useSession() drives a nanostore via
 * useSyncExternalStore/useRef that throws during Next's server render
 * ("Cannot read properties of null (reading 'useRef')") on every admin page —
 * the page only survives via a client-render fallback. Since the (admin) layout
 * already has the session server-side, we provide the user through context.
 *
 * The return shape mirrors useSession's { data, isPending } so call sites that
 * read `session?.user?.…` need no other change. The session is synchronous here,
 * so isPending is always false — which also removes the first-render role flash
 * that bounced owners out of role-guarded pages.
 */
export function useSessionUser(): { data: { user: SessionUser } | null; isPending: boolean } {
  const user = useContext(SessionUserContext);
  return { data: user ? { user } : null, isPending: false };
}
