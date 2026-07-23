"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Store, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const registerSchema = z.object({
    name: z.string().min(2, "Nama terlalu pendek"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    storeName: z.string().min(3, "Nama toko minimal 3 karakter"),
    phone: z.string().optional(),
    planKey: z.string().min(1, "Paket harus dipilih"),
});

export function RegisterClient({
    plans,
    defaultPlanKey
}: {
    plans: any[];
    defaultPlanKey?: string;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            storeName: "",
            phone: "",
            planKey: defaultPlanKey || "starter",
        },
    });

    const planKey = watch("planKey");

    async function onSubmit(values: z.infer<typeof registerSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/register-tenant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal mendaftar");
                return;
            }

            // Immediately sign in so cookies are set correctly on the client
            const signInRes = await authClient.signIn.email({
                email: values.email,
                password: values.password,
            });

            if (signInRes.error) {
                toast.error("Pendaftaran berhasil, tetapi gagal masuk. Silakan login manual.");
                router.push("/login");
                return;
            }

            toast.success("Toko berhasil dibuat! Selamat datang di HanLaptop ERP.");
            router.push("/dashboard");
            router.refresh();
        } catch (error: any) {
            toast.error("Terjadi kesalahan jaringan");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
                <Store className="mx-auto mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-2xl font-bold">Daftarkan Toko Anda</CardTitle>
                <CardDescription>Mulai gunakan HanLaptop ERP dalam hitungan menit.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Pilih Paket</Label>
                        <Select onValueChange={(val) => setValue("planKey", val)} defaultValue={planKey}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih paket langganan" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map((p) => (
                                    <SelectItem key={p.key} value={p.key}>
                                        {p.name} — {p.priceMonthly ? `Rp${p.priceMonthly.toLocaleString('id-ID')}/bln` : "Hubungi Kami"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.planKey && <p className="text-sm text-red-500">{errors.planKey.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nama Toko</Label>
                            <Input placeholder="Toko Han Laptop" {...register("storeName")} />
                            {errors.storeName && <p className="text-sm text-red-500">{errors.storeName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Nomor Telepon (Opsional)</Label>
                            <Input placeholder="08123456789" {...register("phone")} />
                            {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nama Pemilik (Admin)</Label>
                        <Input placeholder="Budi Santoso" {...register("name")} />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" placeholder="budi@example.com" {...register("email")} />
                        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" placeholder="Minimal 8 karakter" {...register("password")} />
                        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                    </div>

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyiapkan toko Anda...
                            </>
                        ) : (
                            "Daftar Sekarang"
                        )}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                        Masuk di sini
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
