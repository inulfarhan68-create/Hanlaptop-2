import * as path from 'path';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Load env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

async function main() {
    const { db } = await import('./src/db');
    const { user, stores, userStoreAccess } = await import('./src/db/schema');
    const { eq } = await import('drizzle-orm');

    try {
        console.log("Fetching all stores...");
        const allStores = await db.select().from(stores);
        console.log(`Found ${allStores.length} stores.`);

        const targetEmails = ['inulfarhan68@gmail.com', 'admin@hanlaptop.com'];

        for (const email of targetEmails) {
            console.log(`Processing user: ${email}...`);
            const userData = await db.select().from(user).where(eq(user.email, email));
            
            if (userData.length > 0) {
                const userId = userData[0].id;
                console.log(`Found user ID: ${userId}. Checking current access...`);
                
                // Fetch current access
                const existingAccess = await db.select().from(userStoreAccess).where(eq(userStoreAccess.userId, userId));
                const existingStoreIds = new Set(existingAccess.map(a => a.storeId));
                
                for (const store of allStores) {
                    if (!existingStoreIds.has(store.id)) {
                        console.log(`Granting access to store: ${store.name} (${store.id})...`);
                        await db.insert(userStoreAccess).values({
                            id: crypto.randomUUID(),
                            userId: userId,
                            storeId: store.id,
                            role: 'owner'
                        });
                    } else {
                        console.log(`User already has access to store: ${store.name}`);
                    }
                }
            } else {
                console.log(`User ${email} not found in database.`);
            }
        }
        console.log("Store access mapping complete.");
    } catch (e) {
        console.error("Failed to grant store access:", e);
    }
}

main();
