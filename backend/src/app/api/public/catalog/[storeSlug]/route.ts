import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/public/catalog";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
    try {
        const { storeSlug } = await params;
        const result = await getPublicCatalog(storeSlug);

        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.data);
    } catch (error: any) {
        console.error("Public Catalog API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
