import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        url: request.url,
        nextUrl: request.nextUrl.toString(),
        pathname: request.nextUrl.pathname,
        headers: Object.fromEntries(request.headers.entries()),
    });
}
