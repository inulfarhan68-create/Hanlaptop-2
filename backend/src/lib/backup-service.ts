/**
 * Automated Cloud Backup Service
 *
 * Provides scheduled backup functionality for disaster recovery.
 * Supports multiple cloud storage backends (Cloudflare R2, AWS S3, etc.)
 *
 * Usage:
 *   npx tsx src/lib/backup-service.ts
 *
 * For cron scheduling, add to your deployment:
 *   - Vercel Cron: vercel.json cron job
 *   - Railway/Render: Built-in cron
 *   - Dedicated server: crontab -e
 */

import { db } from "@/db";
import {
    storeSettings, customers, inventory, transactions,
    transactionItems, journalEntries, serviceOrders,
    activityLogs, employees, technicians, cashierShifts
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

export interface BackupConfig {
    storeId: string;
    includeLogs: boolean;
    compress: boolean;
}

export interface CloudStorageConfig {
    type: "cloudflare-r2" | "aws-s3" | "local";
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    accountId?: string;
    apiToken?: string;
    localPath?: string;
}

export interface BackupResult {
    success: boolean;
    backupId: string;
    filename: string;
    size: number;
    storeCount: number;
    tableCounts: Record<string, number>;
    uploadUrl?: string;
    error?: string;
}

/**
 * Generate backup data for a specific store
 */
export async function generateBackupData(storeId: string, includeLogs: boolean = false) {
    console.log(`📦 Generating backup for store: ${storeId}`);

    const tableCounts: Record<string, number> = {};

    // Fetch all tables for this store
    const [
        settings,
        customersData,
        inventoryData,
        transactionsData,
        journalsData,
        serviceOrdersData,
        employeesData,
        techniciansData,
        shiftsData,
        logsData
    ] = await Promise.all([
        db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, storeId) }),
        db.select().from(customers).where(eq(customers.storeId, storeId)),
        db.select().from(inventory).where(eq(inventory.storeId, storeId)),
        db.select().from(transactions).where(eq(transactions.storeId, storeId)),
        db.select().from(journalEntries).where(eq(journalEntries.storeId, storeId)),
        db.select().from(serviceOrders).where(eq(serviceOrders.storeId, storeId)),
        db.select().from(employees).where(eq(employees.storeId, storeId)),
        db.select().from(technicians).where(eq(technicians.storeId, storeId)),
        db.select().from(cashierShifts).where(eq(cashierShifts.storeId, storeId)),
        includeLogs ? db.select().from(activityLogs).where(eq(activityLogs.storeId, storeId)) : Promise.resolve([]),
    ]);

    // Fetch transaction items for these transactions
    let transactionItemsData: any[] = [];
    const txIds = transactionsData.map((tx) => tx.id);
    if (txIds.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < txIds.length; i += chunkSize) {
            const chunk = txIds.slice(i, i + chunkSize);
            const chunkItems = await db.select().from(transactionItems).where(inArray(transactionItems.transactionId, chunk));
            transactionItemsData.push(...chunkItems);
        }
    }

    // Count records
    tableCounts.customers = customersData.length;
    tableCounts.inventory = inventoryData.length;
    tableCounts.transactions = transactionsData.length;
    tableCounts.transactionItems = transactionItemsData.length;
    tableCounts.journalEntries = journalsData.length;
    tableCounts.serviceOrders = serviceOrdersData.length;
    tableCounts.employees = employeesData.length;
    tableCounts.technicians = techniciansData.length;
    tableCounts.cashierShifts = shiftsData.length;
    tableCounts.activityLogs = logsData.length;

    console.log(`   ✅ Generated backup with ${Object.values(tableCounts).reduce((a, b) => a + b, 0)} total records`);

    return {
        version: "2.0",
        generatedAt: new Date().toISOString(),
        storeId,
        data: {
            storeSettings: settings || null,
            customers: customersData,
            inventory: inventoryData,
            transactions: transactionsData,
            transactionItems: transactionItemsData,
            journalEntries: journalsData,
            serviceOrders: serviceOrdersData,
            employees: employeesData,
            technicians: techniciansData,
            cashierShifts: shiftsData,
            activityLogs: logsData
        },
        tableCounts
    };
}

/**
 * Save backup to local filesystem
 */
function saveBackupLocally(data: any, filename: string, localPath: string = "./backups"): string {
    if (!existsSync(localPath)) {
        mkdirSync(localPath, { recursive: true });
    }

    const filepath = join(localPath, filename);
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved to: ${filepath}`);

    return filepath;
}

/**
 * Upload backup to Cloudflare R2
 */
async function uploadToR2(data: any, filename: string, config: CloudStorageConfig): Promise<string> {
    const accountId = config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = config.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    const bucket = config.bucket || process.env.CLOUDFLARE_BUCKET;

    if (!accountId || !apiToken || !bucket) {
        throw new Error("Missing Cloudflare R2 configuration. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_BUCKET environment variables.");
    }

    const jsonData = JSON.stringify(data);
    const credentials = Buffer.from(`${accountId}:${apiToken}`).toString("base64");

    // Upload to R2 using S3-compatible API
    const response = await fetch(
        `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${filename}`,
        {
            method: "PUT",
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
                "Content-Length": jsonData.length.toString()
            },
            body: jsonData
        }
    );

    if (!response.ok) {
        throw new Error(`R2 upload failed: ${response.statusText}`);
    }

    const url = `https://${bucket}.${accountId}.r2.dev/${filename}`;
    console.log(`   ☁️  Uploaded to R2: ${url}`);
    return url;
}

/**
 * Upload backup to AWS S3
 */
async function uploadToS3(data: any, filename: string, config: CloudStorageConfig): Promise<string> {
    const accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const region = config.region || process.env.AWS_REGION || "ap-southeast-1";
    const bucket = config.bucket || process.env.AWS_S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !bucket) {
        throw new Error("Missing AWS S3 configuration. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.");
    }

    // For production, use AWS SDK v3
    // For simplicity, we'll use the fetch API with Signature Version 4
    // This is a simplified implementation - in production, use @aws-sdk/client-s3

    const jsonData = JSON.stringify(data);
    const now = new Date();
    const dateStamp = now.toISOString().split("T")[0].replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

    // Note: Full S3 SigV4 signing requires crypto operations
    // For production, use AWS SDK: new S3Client({ ... }), await send(new PutObjectCommand({ ... }))
    throw new Error("AWS S3 upload not implemented. Use Cloudflare R2 or local backup.");
}

/**
 * Create and upload a backup
 */
export async function createBackup(
    storeId: string,
    storageConfig: CloudStorageConfig,
    options: { includeLogs?: boolean; description?: string } = {}
): Promise<BackupResult> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${storeId}-${timestamp}.json`;

    try {
        // Generate backup data
        const data = await generateBackupData(storeId, options.includeLogs ?? false);

        let uploadUrl: string | undefined;

        // Upload based on storage type
        switch (storageConfig.type) {
            case "cloudflare-r2":
                uploadUrl = await uploadToR2(data, filename, storageConfig);
                break;
            case "aws-s3":
                uploadUrl = await uploadToS3(data, filename, storageConfig);
                break;
            case "local":
            default:
                const filepath = saveBackupLocally(data, filename, storageConfig.localPath || "./backups");
                uploadUrl = filepath;
                break;
        }

        // Calculate size
        const size = JSON.stringify(data).length;

        // Log backup activity
        await db.insert(activityLogs).values({
            storeId,
            userId: "system",
            userName: "Backup System",
            action: "BACKUP_CREATED",
            entityType: "backup",
            entityId: backupId,
            details: JSON.stringify({
                filename,
                size,
                storeCount: 1,
                tableCounts: data.tableCounts,
                description: options.description || "Automated backup"
            })
        });

        return {
            success: true,
            backupId,
            filename,
            size,
            storeCount: 1,
            tableCounts: data.tableCounts,
            uploadUrl
        };
    } catch (error: any) {
        console.error(`   ❌ Backup failed: ${error.message}`);
        return {
            success: false,
            backupId,
            filename,
            size: 0,
            storeCount: 0,
            tableCounts: {},
            error: error.message
        };
    }
}

/**
 * List available backups (for local storage)
 */
export function listLocalBackups(localPath: string = "./backups"): Array<{ filename: string; size: number; modified: Date }> {
    if (!existsSync(localPath)) {
        return [];
    }

    const { readdirSync, statSync } = require("fs");
    return readdirSync(localPath)
        .filter((f: string) => f.endsWith(".json"))
        .map((f: string) => {
            const stat = statSync(join(localPath, f));
            return {
                filename: f,
                size: stat.size,
                modified: stat.mtime
            };
        })
        .sort((a: any, b: any) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Delete old local backups (keep last N)
 */
export function cleanupOldBackups(localPath: string = "./backups", keepCount: number = 7): void {
    const backups = listLocalBackups(localPath);
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
        const filepath = join(localPath, backup.filename);
        unlinkSync(filepath);
        console.log(`   🗑️  Deleted old backup: ${backup.filename}`);
    }

    console.log(`   ✅ Kept ${Math.min(keepCount, backups.length)} most recent backups`);
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    async function main() {
        const storeId = args[0] || "all";
        const storageType = (args[1] || process.env.BACKUP_STORAGE || "local") as CloudStorageConfig["type"];

        const storageConfig: CloudStorageConfig = {
            type: storageType,
            bucket: process.env.CLOUDFLARE_BUCKET || process.env.AWS_S3_BUCKET,
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
            apiToken: process.env.CLOUDFLARE_API_TOKEN,
            localPath: process.env.BACKUP_LOCAL_PATH || "./backups"
        };

        console.log("🚀 Starting Automated Backup...");
        console.log(`   Storage: ${storageType}`);
        console.log(`   Store: ${storeId}`);

        const result = await createBackup(storeId, storageConfig, {
            includeLogs: true,
            description: "CLI backup"
        });

        if (result.success) {
            console.log("\n✅ Backup completed successfully!");
            console.log(`   Backup ID: ${result.backupId}`);
            console.log(`   Filename: ${result.filename}`);
            console.log(`   Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   URL: ${result.uploadUrl}`);

            // Cleanup old backups if using local storage
            if (storageType === "local") {
                cleanupOldBackups(storageConfig.localPath, 7);
            }
        } else {
            console.error(`\n❌ Backup failed: ${result.error}`);
            process.exit(1);
        }
    }

    main();
}
