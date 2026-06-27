import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

async function resolveParams(ctx: any) {
    if (!ctx || !ctx.params) return {};
    if (typeof ctx.params.then === 'function') {
        return await ctx.params;
    }
    return ctx.params;
}

export async function GET(request: NextRequest, ctx: any) {
    const params = await resolveParams(ctx);
    return handler.GET(request, { params });
}

export async function POST(request: NextRequest, ctx: any) {
    const params = await resolveParams(ctx);
    return handler.POST(request, { params });
}
