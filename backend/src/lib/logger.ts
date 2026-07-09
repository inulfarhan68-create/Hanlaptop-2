/**
 * Production-grade logging utility
 * Uses Pino for structured JSON logging with correlation IDs
 */

import pino from "pino";

// Create base logger with production defaults
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}), // We'll add these per-request
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "req.body.cardNumber",
      "req.body.cvv",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(context: {
  requestId: string;
  storeId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
}) {
  return logger.child({
    requestId: context.requestId,
    storeId: context.storeId || "system",
    userId: context.userId || "anonymous",
    endpoint: context.endpoint || "unknown",
    method: context.method || "UNKNOWN",
  });
}

/**
 * Create a logger for background jobs/cron
 */
export function createJobLogger(jobName: string, metadata?: Record<string, any>) {
  return logger.child({
    type: "job",
    jobName,
    ...metadata,
  });
}

/**
 * Create a logger for database operations
 */
export function createDbLogger(requestId: string) {
  return logger.child({
    type: "database",
    requestId,
  });
}

/**
 * Log levels for different operations
 */
export const logLevels = {
  audit: "info", // Audit events
  security: "warn", // Security events
  performance: "debug", // Performance metrics
  business: "info", // Business events
} as const;

export type LogLevel = keyof typeof logLevels;

/**
 * Audit log helper - always logs with level "info"
 * Use for critical business events that need to be searchable
 */
export function auditLog(context: {
  requestId: string;
  storeId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, any>;
}) {
  logger.info({
    type: "audit",
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Security log helper - always logs with level "warn"
 * Use for security-relevant events (failed logins, permission denied, etc.)
 */
export function securityLog(context: {
  requestId: string;
  storeId?: string;
  userId?: string;
  action: string;
  reason?: string;
  ip?: string;
  metadata?: Record<string, any>;
}) {
  logger.warn({
    type: "security",
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
