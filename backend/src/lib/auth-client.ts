import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL + "/api/auth" : (typeof window !== "undefined" ? window.location.origin + "/_/backend/api/auth" : "http://localhost:3000/_/backend/api/auth"),
});

export const { signIn, signUp, signOut, useSession, changePassword, updateUser, changeEmail } = authClient;
