import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// Bypass auth untuk health check
export const dynamic = "force-dynamic";

/**
 * Health Check Endpoint — /api/health
 *
 * Returns system health status including:
 * - API availability
 * - Database connectivity
 * - Uptime and memory usage
 *
 * Use with monitoring services (UptimeRobot, Vercel Monitoring, etc.)
 */
export async function GET() {
    const start = Date.now();

    // Check database connectivity
    let dbStatus = "healthy";
    let dbLatencyMs = 0;
    try {
        const dbStart = Date.now();
        await db.run(sql`SELECT 1`);
        dbLatencyMs = Date.now() - dbStart;
    } catch (err: any) {
        dbStatus = `unhealthy: ${err.message?.substring(0, 100)}`;
    }

    const totalLatency = Date.now() - start;
    const memUsage = process.memoryUsage();
    const isHealthy = dbStatus === "healthy";

    // Return JSON directly without going through auth
    return new NextResponse(JSON.stringify({
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev",
        uptime: Math.floor(process.uptime()),
        checks: {
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
            },
            api: {
                status: "healthy",
                latencyMs: totalLatency,
            },
        },
        memory: {
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
    }), {
        status: isHealthy ? 200 : 503,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        }
    });
}
