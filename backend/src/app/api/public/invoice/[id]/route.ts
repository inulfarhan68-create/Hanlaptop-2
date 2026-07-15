import { NextResponse } from "next/server";
import { getPublicInvoice } from "@/lib/public/invoices";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        const result = await getPublicInvoice(id);

        if ("error" in result) {
            return NextResponse.json(
                { error: result.error, ...(result.isVoided ? { isVoided: true } : {}) },
                { status: result.status }
            );
        }

        return NextResponse.json(result.data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
