import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import PlatformClient from "./client";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
    title: "Platform Console | HanLaptop",
};

export default async function PlatformPage() {
    const session = await requirePlatformAdmin();
    if (session instanceof NextResponse) {
        redirect("/");
    }

    // Fetch all tenants
    const orgs = await db.query.organizations.findMany({
        with: {
            stores: true
        }
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Console</h1>
                <p className="text-muted-foreground mt-2">
                    Super admin view: manage all organizations and tenants.
                </p>
                {session.isImpersonating && (
                    <div className="mt-4 p-4 bg-orange-100 border border-orange-500 rounded-lg text-orange-900 font-semibold flex items-center justify-between">
                        <div>
                            <span className="block text-xl">⚠️ You are currently impersonating an Organization.</span>
                            <span className="text-sm font-normal">All your actions will be recorded as if you were the tenant owner.</span>
                        </div>
                    </div>
                )}
            </div>
            
            <PlatformClient 
                organizations={orgs}
                isImpersonating={!!session.isImpersonating}
                currentOrgId={session.organizationId}
            />
        </div>
    );
}
