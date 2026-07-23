import { NextResponse } from "next/server";
import { db } from "@/db";
import { devicePassports, deviceLifecycleLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ sn: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { sn } = await context.params;
        const decodedSn = decodeURIComponent(sn);

        let conditions = [eq(devicePassports.serialNumber, decodedSn)];
        const scope = storeScope(authResult, devicePassports.storeId);
        if (scope) conditions.push(scope);

        const passport = await db.query.devicePassports.findFirst({
            where: and(...conditions),
            with: {
                inventory: {
                    columns: {
                        itemName: true,
                        category: true,
                        specs: true
                    }
                },
                logs: {
                    with: {
                        actor: {
                            columns: {
                                name: true
                            }
                        }
                    },
                    orderBy: [desc(deviceLifecycleLogs.createdAt)]
                }
            }
        });

        if (!passport) {
            return NextResponse.json({ error: "Passport not found" }, { status: 404 });
        }

        return NextResponse.json(passport);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
