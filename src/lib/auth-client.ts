import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
});

export const { signIn, signUp, signOut, useSession, changePassword, updateUser, changeEmail } = authClient;
