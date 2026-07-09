/**
 * Sentry Integration for Next.js Backend
 *
 * Setup:
 * 1. Install: npm install @sentry/next
 * 2. Create .env.local with SENTRY_DSN
 * 3. Import in instrumentation.ts
 */

import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";

/**
 * Initialize Sentry for server-side
 */
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Don't capture useless errors
      ignoreErrors: [
        // Network errors
        "TypeError: Failed to fetch",
        "TypeError: Network request failed",
        // User cancelled
        "TypeError: User aborted",
        // Next.js dev errors
        "Error: connect ECONNREFUSED",
      ],

      // Custom tag for multi-tenant identification
      beforeSend(event) {
        // Add custom context
        event.tags = {
          ...event.tags,
          environment: process.env.NODE_ENV || "development",
        };

        // Remove PII from error messages
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }

        return event;
      },

      // Set release version
      release: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "dev",
    });

    logger.info({
      type: "sentry",
      message: "Sentry initialized",
      environment: process.env.NODE_ENV,
    });
  } else {
    logger.warn({
      type: "sentry",
      message: "Sentry DSN not configured, error tracking disabled",
    });
  }
}

/**
 * Capture error with additional context
 */
export function captureError(
  error: Error,
  context?: {
    storeId?: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }
) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Just log locally if Sentry not configured
    logger.error({
      type: "error",
      error: error.message,
      stack: error.stack,
      ...context,
    });
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.storeId) {
      scope.setTag("storeId", context.storeId);
    }
    if (context?.userId) {
      scope.setTag("userId", context.userId);
    }
    if (context?.requestId) {
      scope.setTag("requestId", context.requestId);
    }
    if (context?.metadata) {
      Object.entries(context.metadata).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error);
  });
}

/**
 * Set user context for all future errors
 */
export function setUserContext(user: { id: string; email?: string; name?: string } | null) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

export default Sentry;
