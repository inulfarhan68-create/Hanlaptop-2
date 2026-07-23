import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeSettings, activityLogs, stores } from "@/db/schema";
import { requireAuth, requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { storeSettingsSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

const defaultExpenseCategories = [
    "Beban Gaji Karyawan",
    "Beban Listrik & Internet",
    "Beban Sewa Tempat",
    "Beban ATK & Perlengkapan",
    "Beban Pemasaran / Iklan",
    "Beban Transportasi",
    "Beban Perbaikan & Perawatan",
    "Beban Lain-lain"
];

const defaultServiceIssues = [
    { issue: "Mati Total (No Power)", cost: 450000 },
    { issue: "No Display (Nyala tapi layar gelap)", cost: 350000 },
    { issue: "Layar Blank Putih / Bergaris", cost: 500000 },
    { issue: "Blue Screen (BSOD) / Sering Restart", cost: 150000 },
    { issue: "Overheat (Panas berlebih) / Thermal Paste", cost: 150000 },
    { issue: "Kipas (Fan) berisik / tidak muter", cost: 150000 },
    { issue: "Keyboard error / beberapa tombol mati", cost: 300000 },
    { issue: "Baterai drop / kembung / tidak mau ngecas", cost: 400000 },
    { issue: "Engsel patah / casing pecah / lecet", cost: 200000 },
    { issue: "Install ulang OS (Windows/Mac) / Bootloop", cost: 100000 },
    { issue: "Upgrade RAM / Tambah Kapasitas", cost: 150000 },
    { issue: "Upgrade SSD / HDD lemot", cost: 150000 },
    { issue: "Pembersihan Debu (Cleaning Kipas/Mobo)", cost: 150000 },
    { issue: "Speaker sember / mati sebelah / tidak ada suara", cost: 150000 },
    { issue: "Port USB / HDMI / Audio / Charger longgar/rusak", cost: 150000 },
    { issue: "Wifi / Bluetooth tidak terdeteksi", cost: 150000 },
    { issue: "Lupa Password Windows / BIOS lock", cost: 100000 },
    { issue: "Terkena Air (Water Damage / Korosi)", cost: 500000 },
    { issue: "Touchpad error / loncat-loncat", cost: 150000 },
    { issue: "Kamera / Webcam mati", cost: 150000 }
];

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const storeIdValue = authResult.storeId === "all" ? (authResult.accessibleStoreIds?.[0] ?? "default") : authResult.storeId;

        const settings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, storeIdValue)
        });
        if (!settings) {
            let storeInfo = null;
            if (storeIdValue !== "default") {
                storeInfo = await db.query.stores.findFirst({
                    where: eq(stores.id, storeIdValue)
                });
            }

            return NextResponse.json({
                storeName: storeInfo?.name || "HanLaptop",
                storeAddress: storeInfo?.address || "Jl. Cibiru Tonggoh, Kp. Babakan Biru 002/008, Cibiru Wetan, Cileunyi, Kab. Bandung",
                storePhone: storeInfo?.phone || "085161870922",
                storeLogo: null,
                storeFooter: "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dilembalikan.",
                storeBanks: [],
                waTemplatePiutang: "Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih.",
                waTemplateUmum: "Halo Kak {nama}, ini dengan *{toko}*. ",
                waTemplateNota: "Halo Kak {nama}, berikut adalah detail transaksi Kakak di *{toko}* untuk nota *{nota}* senilai *{total}*. Terima kasih telah berbelanja di tempat kami!",
                waTemplateServiceDiterima: "Halo Kak {nama}, laptop *{unit}* telah kami terima di *{toko}* dengan keluhan: *\"{keluhan}\"*. Unit saat ini dalam antrean pengecekan. Cek status: {link}",
                waTemplateServiceDikerjakan: "Halo Kak {nama}, laptop *{unit}* di *{toko}* saat ini sedang dalam proses perbaikan oleh teknisi kami. Cek status: {link}",
                waTemplateServiceMenungguPart: "Halo Kak {nama}, perbaikan laptop *{unit}* di *{toko}* ditangguhkan sementara karena sedang menunggu ketersediaan sparepart. Cek status: {link}",
                waTemplateServiceSelesai: "Halo Kak {nama}, kabar baik! Laptop *{unit}* di *{toko}* selesai diperbaiki. Total Biaya: *{biaya}*. Silakan diambil. Cek detail: {link}",
                waTemplateServiceBatal: "Halo Kak {nama}, mohon maaf perbaikan laptop *{unit}* di *{toko}* dibatalkan karena tidak memungkinkan untuk diperbaiki/suku cadang tidak tersedia. Cek status: {link}",
                expenseCategories: defaultExpenseCategories,
                serviceIssues: defaultServiceIssues,
                enableCashierShift: true,
                requireInboundQc: false,
                serviceWarrantyDays: 30,
                userRole: authResult.storeRole
            }, { status: 200 });
        }

        // Parse the banks JSON string before returning
        let parsedBanks = [];
        if (settings.storeBanks) {
            try {
                parsedBanks = JSON.parse(settings.storeBanks);
            } catch (e) {
                console.error("Failed to parse storeBanks");
            }
        }

        let parsedExpenseCategories = null;
        if (settings.expenseCategories) {
            try {
                parsedExpenseCategories = JSON.parse(settings.expenseCategories);
            } catch (e) {
                console.error("Failed to parse expenseCategories");
            }
        }

        let parsedServiceIssues = null;
        if (settings.serviceIssues) {
            try {
                parsedServiceIssues = JSON.parse(settings.serviceIssues);
            } catch (e) {
                console.error("Failed to parse serviceIssues");
            }
        }

        return NextResponse.json({
            ...settings,
            storeBanks: parsedBanks.length ? parsedBanks : undefined,
            expenseCategories: parsedExpenseCategories || defaultExpenseCategories,
            serviceIssues: parsedServiceIssues || defaultServiceIssues,
            enableCashierShift: settings.enableCashierShift !== false,
            requireInboundQc: settings.requireInboundQc === true,
            serviceWarrantyDays: settings.serviceWarrantyDays ?? 30,
            userRole: authResult.storeRole
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const parsed = storeSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { storeName, storeAddress, storePhone, storeLogo, storeSignature, storeFooter, storeBanks, waTemplatePiutang, waTemplateUmum, waTemplateNota, waTemplateServiceDiterima, waTemplateServiceDikerjakan, waTemplateServiceMenungguPart, waTemplateServiceSelesai, waTemplateServiceBatal, enableCashierShift, requireInboundQc, serviceWarrantyDays, expenseCategories, serviceIssues, applyToAllBranches } = parsed.data;

        const tx = db;
        const existing = await tx.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, authResult.storeId === "all" ? (authResult.accessibleStoreIds?.[0] ?? "default") : authResult.storeId)
        });
        const banksJson = storeBanks ? JSON.stringify(storeBanks) : null;
        const expenseCategoriesJson = expenseCategories ? JSON.stringify(expenseCategories) : null;
        const serviceIssuesJson = serviceIssues ? JSON.stringify(serviceIssues) : null;

        const storeIdValue = authResult.storeId === "all" ? (authResult.accessibleStoreIds?.[0] ?? "default") : authResult.storeId;

        // Use insert with onConflictDoUpdate since storeId is primary key
        const result = await tx.insert(storeSettings).values({
            storeId: storeIdValue,
            storeName,
            storeAddress,
            storePhone: storePhone || "",
            storeLogo: storeLogo || null,
            storeSignature: storeSignature || "",
            storeFooter: storeFooter || "",
            waTemplatePiutang: waTemplatePiutang || "",
            waTemplateUmum: waTemplateUmum || "",
            waTemplateNota: waTemplateNota || "",
            waTemplateServiceDiterima: waTemplateServiceDiterima || "",
            waTemplateServiceDikerjakan: waTemplateServiceDikerjakan || "",
            waTemplateServiceMenungguPart: waTemplateServiceMenungguPart || "",
            waTemplateServiceSelesai: waTemplateServiceSelesai || "",
            waTemplateServiceBatal: waTemplateServiceBatal || "",
            storeBanks: banksJson,
            enableCashierShift: enableCashierShift !== undefined ? enableCashierShift : true,
            requireInboundQc: requireInboundQc !== undefined ? requireInboundQc : false,
            serviceWarrantyDays: serviceWarrantyDays !== undefined ? serviceWarrantyDays : 30,
            expenseCategories: expenseCategoriesJson,
            serviceIssues: serviceIssuesJson,
            updatedAt: new Date()
        }).onConflictDoUpdate({
            target: storeSettings.storeId,
            set: {
                storeName,
                storeAddress,
                storePhone: storePhone !== undefined ? storePhone : (existing?.storePhone ?? ""),
                storeLogo: storeLogo !== undefined ? storeLogo : (existing?.storeLogo ?? null),
                storeSignature: storeSignature !== undefined ? storeSignature : (existing?.storeSignature ?? null),
                storeFooter: storeFooter !== undefined ? storeFooter : (existing?.storeFooter ?? ""),
                waTemplatePiutang: waTemplatePiutang !== undefined ? waTemplatePiutang : (existing?.waTemplatePiutang ?? ""),
                waTemplateUmum: waTemplateUmum !== undefined ? waTemplateUmum : (existing?.waTemplateUmum ?? ""),
                waTemplateNota: waTemplateNota !== undefined ? waTemplateNota : (existing?.waTemplateNota ?? ""),
                waTemplateServiceDiterima: waTemplateServiceDiterima !== undefined ? waTemplateServiceDiterima : (existing?.waTemplateServiceDiterima ?? ""),
                waTemplateServiceDikerjakan: waTemplateServiceDikerjakan !== undefined ? waTemplateServiceDikerjakan : (existing?.waTemplateServiceDikerjakan ?? ""),
                waTemplateServiceMenungguPart: waTemplateServiceMenungguPart !== undefined ? waTemplateServiceMenungguPart : (existing?.waTemplateServiceMenungguPart ?? ""),
                waTemplateServiceSelesai: waTemplateServiceSelesai !== undefined ? waTemplateServiceSelesai : (existing?.waTemplateServiceSelesai ?? ""),
                waTemplateServiceBatal: waTemplateServiceBatal !== undefined ? waTemplateServiceBatal : (existing?.waTemplateServiceBatal ?? ""),
                storeBanks: banksJson !== null ? banksJson : (existing?.storeBanks ?? null),
                enableCashierShift: enableCashierShift !== undefined ? enableCashierShift : (existing?.enableCashierShift ?? true),
                requireInboundQc: requireInboundQc !== undefined ? requireInboundQc : (existing?.requireInboundQc ?? false),
                serviceWarrantyDays: serviceWarrantyDays !== undefined ? serviceWarrantyDays : (existing?.serviceWarrantyDays ?? 30),
                expenseCategories: expenseCategoriesJson !== null ? expenseCategoriesJson : (existing?.expenseCategories ?? null),
                serviceIssues: serviceIssuesJson !== null ? serviceIssuesJson : (existing?.serviceIssues ?? null),
                updatedAt: new Date()
            }
        }).returning();

        // Replicate to all other branches if requested
        if (applyToAllBranches) {
            const allStores = await tx.query.stores.findMany();
            const storeIdsToUpdate = ["default", ...allStores.map(s => s.id)];

            for (const id of storeIdsToUpdate) {
                if (id === storeIdValue) continue;

                // Check existing settings for this branch to preserve its name/address/phone
                const existingBranchSettings = await tx.query.storeSettings.findFirst({
                    where: eq(storeSettings.storeId, id)
                });

                let branchName = existingBranchSettings?.storeName;
                let branchAddress = existingBranchSettings?.storeAddress;
                let branchPhone = existingBranchSettings?.storePhone;

                // If no settings exist yet, default to store info from stores table
                if (!existingBranchSettings && id !== "default") {
                    const storeInfo = await tx.query.stores.findFirst({
                        where: eq(stores.id, id)
                    });
                    branchName = storeInfo?.name;
                    branchAddress = storeInfo?.address || undefined;
                    branchPhone = storeInfo?.phone || undefined;
                }

                await tx.insert(storeSettings).values({
                    storeId: id,
                    storeName: branchName || "HanLaptop",
                    storeAddress: branchAddress || "",
                    storePhone: branchPhone || "",
                    storeLogo: storeLogo || null,
                    storeSignature: storeSignature || "",
                    storeFooter: storeFooter || "",
                    waTemplatePiutang: waTemplatePiutang || "",
                    waTemplateUmum: waTemplateUmum || "",
                    waTemplateNota: waTemplateNota || "",
                    waTemplateServiceDiterima: waTemplateServiceDiterima || "",
                    waTemplateServiceDikerjakan: waTemplateServiceDikerjakan || "",
                    waTemplateServiceMenungguPart: waTemplateServiceMenungguPart || "",
                    waTemplateServiceSelesai: waTemplateServiceSelesai || "",
                    waTemplateServiceBatal: waTemplateServiceBatal || "",
                    storeBanks: banksJson,
                    enableCashierShift: enableCashierShift !== undefined ? enableCashierShift : true,
                    requireInboundQc: requireInboundQc !== undefined ? requireInboundQc : false,
                    serviceWarrantyDays: serviceWarrantyDays !== undefined ? serviceWarrantyDays : 30,
                    expenseCategories: expenseCategoriesJson,
                    serviceIssues: serviceIssuesJson,
                    updatedAt: new Date()
                }).onConflictDoUpdate({
                    target: storeSettings.storeId,
                    set: {
                        storeLogo: storeLogo !== undefined ? storeLogo : (existingBranchSettings?.storeLogo ?? null),
                        storeSignature: storeSignature !== undefined ? storeSignature : (existingBranchSettings?.storeSignature ?? null),
                        storeFooter: storeFooter !== undefined ? storeFooter : (existingBranchSettings?.storeFooter ?? ""),
                        waTemplatePiutang: waTemplatePiutang !== undefined ? waTemplatePiutang : (existingBranchSettings?.waTemplatePiutang ?? ""),
                        waTemplateUmum: waTemplateUmum !== undefined ? waTemplateUmum : (existingBranchSettings?.waTemplateUmum ?? ""),
                        waTemplateNota: waTemplateNota !== undefined ? waTemplateNota : (existingBranchSettings?.waTemplateNota ?? ""),
                        waTemplateServiceDiterima: waTemplateServiceDiterima !== undefined ? waTemplateServiceDiterima : (existingBranchSettings?.waTemplateServiceDiterima ?? ""),
                        waTemplateServiceDikerjakan: waTemplateServiceDikerjakan !== undefined ? waTemplateServiceDikerjakan : (existingBranchSettings?.waTemplateServiceDikerjakan ?? ""),
                        waTemplateServiceMenungguPart: waTemplateServiceMenungguPart !== undefined ? waTemplateServiceMenungguPart : (existingBranchSettings?.waTemplateServiceMenungguPart ?? ""),
                        waTemplateServiceSelesai: waTemplateServiceSelesai !== undefined ? waTemplateServiceSelesai : (existingBranchSettings?.waTemplateServiceSelesai ?? ""),
                        waTemplateServiceBatal: waTemplateServiceBatal !== undefined ? waTemplateServiceBatal : (existingBranchSettings?.waTemplateServiceBatal ?? ""),
                        storeBanks: banksJson !== null ? banksJson : (existingBranchSettings?.storeBanks ?? null),
                        enableCashierShift: enableCashierShift !== undefined ? enableCashierShift : (existingBranchSettings?.enableCashierShift ?? true),
                        requireInboundQc: requireInboundQc !== undefined ? requireInboundQc : (existingBranchSettings?.requireInboundQc ?? false),
                        serviceWarrantyDays: serviceWarrantyDays !== undefined ? serviceWarrantyDays : (existingBranchSettings?.serviceWarrantyDays ?? 30),
                        expenseCategories: expenseCategoriesJson !== null ? expenseCategoriesJson : (existingBranchSettings?.expenseCategories ?? null),
                        serviceIssues: serviceIssuesJson !== null ? serviceIssuesJson : (existingBranchSettings?.serviceIssues ?? null),
                        updatedAt: new Date()
                    }
                });
            }
        }

        // Log activity
        await tx.insert(activityLogs).values({
            storeId: storeIdValue,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_SETTINGS",
            entityType: "settings",
            entityId: storeIdValue,
            details: JSON.stringify({ storeName, storePhone, applyToAllBranches })
        });

        return NextResponse.json(result[0], { status: 200 });
    } catch (error: any) {
        console.error("Failed to update settings:", error);
        return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
    }
}
