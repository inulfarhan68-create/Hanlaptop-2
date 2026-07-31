import { config } from 'dotenv'; config({ path: '.env.local' });
import { db } from '../src/db';
import { stores } from '../src/db/schema';
import { seedDemoData } from '../src/services/DemoSeeder';
import * as fs from 'fs';

async function run() {
    try {
        const storeList = await db.select().from(stores).limit(1);
        if (!storeList.length) { 
            fs.writeFileSync('error.txt', 'NO_STORE'); 
            return process.exit(1); 
        }
        const storeId = storeList[0].id;
        
        // get real user from db
        const { userStoreAccess } = await import('../src/db/schema');
        const { eq } = await import('drizzle-orm');
        const access = await db.select().from(userStoreAccess).where(eq(userStoreAccess.storeId, storeId)).limit(1);
        const userId = access.length ? access[0].userId : 'some-random';

        console.log('Seeding store:', storeId, 'with user:', userId);
        await seedDemoData(storeId, userId);
        fs.writeFileSync('error.txt', 'SUCCESS');
        console.log('SUCCESS');
    } catch(e: any) {
        fs.writeFileSync('error.txt', String(e.stack || e));
        console.log('ERROR', e.message);
    } finally {
        process.exit(0);
    }
}
run();
