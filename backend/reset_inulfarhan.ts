import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

async function main() {
    const { db } = await import('./src/db');
    const { user, session, account, userStoreAccess } = await import('./src/db/schema');
    const { eq } = await import('drizzle-orm');
    const { auth } = await import('./src/lib/auth');

    try {
        console.log("Looking for user inulfarhan68@gmail.com...");
        const targetEmail = 'inulfarhan68@gmail.com';
        const existing = await db.select().from(user).where(eq(user.email, targetEmail));
        
        if (existing.length > 0) {
            const userId = existing[0].id;
            console.log(`User found (ID: ${userId}). Clearing existing records...`);
            
            // Delete dependent records
            await db.delete(session).where(eq(session.userId, userId));
            await db.delete(account).where(eq(account.userId, userId));
            await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, userId));
            await db.delete(user).where(eq(user.id, userId));
            console.log("Records cleared.");
        } else {
            console.log("User not found in database. Proceeding to create...");
        }

        // Recreate user using Better Auth API
        console.log("Creating user using Better Auth...");
        const result = await auth.api.signUpEmail({
            body: {
                email: targetEmail,
                password: "password123", // Temporary password
                name: "Farhan Imanul Haq",
                role: "owner"
            }
        });
        
        console.log("User recreated successfully on Turso:", result);
    } catch (e) {
        console.error("Failed to reset user:", e);
    }
}

main();
