import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPublicPlans } from "@/lib/public/plans";

export const metadata: Metadata = {
    title: "Daftar toko — HanLaptop ERP",
    description: "Daftarkan toko laptop Anda ke HanLaptop ERP.",
};

/**
 * Placeholder for self-serve tenant registration. The real onboarding flow
 * (create user → org → first store → COA seed → trial subscription) lands in a
 * later phase; this keeps the landing/pricing CTAs working and demoable now.
 */
export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string }>;
}) {
    const { plan: planKey } = await searchParams;
    const plans = await getPublicPlans();
    const selected = plans.find((p) => p.key === planKey);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Store className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">Daftarkan toko Anda</h1>
                    {selected ? (
                        <p className="text-sm text-muted-foreground">
                            Paket dipilih: <span className="font-medium text-foreground">{selected.name}</span>
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Pilih paket di halaman harga, lalu daftar di sini.</p>
                    )}
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        Pendaftaran mandiri sedang disiapkan. Sebentar lagi Anda bisa membuat akun toko
                        sendiri lengkap dengan cabang pertama dan pembukuan siap pakai.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Link href="/login"><Button className="w-full">Sudah punya akun? Masuk</Button></Link>
                        <Link href="/product"><Button variant="outline" className="w-full">Kembali ke harga</Button></Link>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
