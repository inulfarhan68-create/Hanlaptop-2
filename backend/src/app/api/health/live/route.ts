/**
 * Liveness Probe — /api/health/live
 *
 * Simple ping endpoint for Kubernetes liveness probes
 * Returns 200 immediately if the process is running
 *
 * This should NEVER return an error - it's just checking if the server process is alive
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
}
