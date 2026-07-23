import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPublicPlans } from "@/lib/public/plans";

import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
    title: "Daftar toko — HanLaptop ERP",
    description: "Daftarkan toko laptop Anda ke HanLaptop ERP.",
};

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string }>;
}) {
    const { plan: planKey } = await searchParams;
    const plans = await getPublicPlans();

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
            <RegisterClient plans={plans} defaultPlanKey={planKey} />
        </main>
    );
}
