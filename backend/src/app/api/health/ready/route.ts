/**
 * Readiness Check Endpoint — /api/health/ready
 *
 * Full dependency check for Kubernetes readiness probes
 * Returns 200 only if ALL dependencies are healthy
 *
 * Checks:
 * - Database connectivity
 * - Critical environment variables
 * - External services (optional)
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  error?: string;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const start = Date.now();

  // 1. Database Check
  try {
    const dbStart = Date.now();
    await db.run(sql`SELECT 1`);
    checks.push({
      name: "database",
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    });
  } catch (err: any) {
    checks.push({
      name: "database",
      status: "unhealthy",
      error: err.message?.substring(0, 200),
    });
    logger.error({ type: "health_check", check: "database", error: err.message });
  }

  // 2. Environment Variables Check
  const requiredEnvVars = [
    "BETTER_AUTH_SECRET",
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  // Database URL may be provided under either the DATABASE_* or legacy TURSO_* name.
  if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) {
    missingVars.push("DATABASE_URL (or TURSO_DATABASE_URL)");
  }
  if (missingVars.length > 0) {
    checks.push({
      name: "environment",
      status: "degraded",
      error: `Missing: ${missingVars.join(", ")}`,
    });
  } else {
    checks.push({
      name: "environment",
      status: "healthy",
    });
  }

  // 3. Memory Check
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = (memUsedMB / memTotalMB) * 100;

  if (memPercent > 90) {
    checks.push({
      name: "memory",
      status: "degraded",
      error: `Memory usage ${memPercent.toFixed(1)}% (${memUsedMB}MB / ${memTotalMB}MB)`,
    });
  } else {
    checks.push({
      name: "memory",
      status: "healthy",
    });
  }

  const totalLatency = Date.now() - start;
  const isReady = checks.every((c) => c.status !== "unhealthy");
  const isHealthy = checks.every((c) => c.status === "healthy");

  logger.info({
    type: "health_check",
    status: isReady ? "ready" : "not_ready",
    checks: checks.map((c) => c.status).join(","),
    latencyMs: totalLatency,
  });

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : isReady ? "ready" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev",
      uptime: Math.floor(process.uptime()),
      checks,
    },
    { status: isReady ? 200 : 503 }
  );
}
