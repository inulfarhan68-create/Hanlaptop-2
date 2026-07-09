/**
 * Request ID & Correlation ID Middleware
 *
 * Every request gets a unique requestId that flows through:
 * - Request
 * - Response headers
 * - All database operations
 * - All log entries
 * - Error tracking (Sentry)
 *
 * Usage:
 *   import { requestIdMiddleware } from '@/lib/request-id'
 *   router.use(requestIdMiddleware)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "./logger";

// Header names
export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";

// Extend NextRequest type to include requestId
declare global {
  // eslint-disable-next-line no-var
  var currentRequestId: string | undefined;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Middleware function to add request ID to every request
 * Attach to your Next.js app/edge router
 */
export function requestIdMiddleware(request: NextRequest): {
  request: NextRequest;
  requestId: string;
  response: NextResponse;
} {
  // Check for existing request ID (from upstream load balancer/gateway)
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER);
  const correlationId = request.headers.get(CORRELATION_ID_HEADER);

  // Generate new request ID if not provided
  const requestId = incomingRequestId || generateRequestId();

  // Create response with request ID headers
  // Note: We can't modify headers in middleware for Next.js App Router
  // but we can set them in route handlers

  // Make requestId available globally (for use in database queries, etc.)
  global.currentRequestId = requestId;

  return {
    request,
    requestId,
    response: NextResponse.next({
      request: {
        headers: request.headers,
      },
    }),
  };
}

/**
 * Add request ID headers to response
 * Call this in your route handlers
 */
export function addRequestIdHeaders(
  response: NextResponse,
  requestId: string,
  correlationId?: string
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  if (correlationId) {
    response.headers.set(CORRELATION_ID_HEADER, correlationId);
  }
  return response;
}

/**
 * Get current request ID (from global context)
 * Works in route handlers and utility functions
 */
export function getCurrentRequestId(): string {
  return global.currentRequestId || "no-request-id";
}

/**
 * Create a child logger with current request context
 */
export function getRequestLogger(storeId?: string, userId?: string) {
  return logger.child({
    requestId: getCurrentRequestId(),
    storeId: storeId || "system",
    userId: userId || "anonymous",
  });
}

/**
 * Utility to trace a function call with request ID
 * Usage:
 *   const trace = createTrace('processPayment', { storeId, amount })
 *   try {
 *     await doSomething()
 *     trace.success()
 *   } catch (e) {
 *     trace.error(e)
 *   }
 */
export function createTrace(
  operation: string,
  metadata?: Record<string, any>
): {
  success: (result?: any) => void;
  error: (error: Error) => void;
} {
  const startTime = Date.now();
  const requestId = getCurrentRequestId();

  return {
    success: (result?: any) => {
      const duration = Date.now() - startTime;
      logger.info({
        type: "operation",
        requestId,
        operation,
        duration,
        status: "success",
        ...metadata,
      });
    },
    error: (error: Error) => {
      const duration = Date.now() - startTime;
      logger.error({
        type: "operation",
        requestId,
        operation,
        duration,
        status: "error",
        error: error.message,
        stack: error.stack,
        ...metadata,
      });
    },
  };
}

/**
 * Wrap an async function with automatic tracing
 */
export async function withTrace<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const trace = createTrace(operation, metadata);
  try {
    const result = await fn();
    trace.success(result);
    return result;
  } catch (error) {
    trace.error(error as Error);
    throw error;
  }
}
