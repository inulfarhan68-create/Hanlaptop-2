import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
}

async function main() {
    const { db } = await import('./src/db');
    const { stores } = await import('./src/db/schema');
    const { eq } = await import('drizzle-orm');

    try {
        console.log("Fetching all stores...");
        const allStores = await db.select().from(stores);
        
        for (const store of allStores) {
            let slugValue = store.slug;
            if (!slugValue || slugValue === 'null') {
                slugValue = slugify(store.name);
                // Handle duplicate or default cases
                if (store.id === 'default') {
                    slugValue = 'default';
                }
                
                console.log(`Updating store "${store.name}" with slug: "${slugValue}"...`);
                await db.update(stores)
                    .set({ slug: slugValue })
                    .where(eq(stores.id, store.id));
            } else {
                console.log(`Store "${store.name}" already has slug: "${slugValue}"`);
            }
        }
        console.log("Slugs populated successfully.");
    } catch (e) {
        console.error("Failed to populate slugs:", e);
    }
}

main();
