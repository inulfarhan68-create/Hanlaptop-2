/**
 * Next.js Instrumentation
 *
 * This file is loaded once when the Next.js server starts.
 * Use it for server-side initialization like Sentry.
 */

import * as Sentry from "@sentry/nextjs";

export function register() {
  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      release: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "dev",
    });
  }
}
