import { db } from "@/db";
import { usageCounters } from "@/db/schema/saas";
import { eq, and } from "drizzle-orm";

/**
 * Increment a usage counter for a specific resource (e.g. 'transactions')
 * for the current billing period. 
 */
export async function incrementUsage(organizationId: string, resource: "transactions") {
    const now = new Date();
    
    // Find active counter for this month
    const currentCounter = await db.query.usageCounters.findFirst({
        where: and(
            eq(usageCounters.organizationId, organizationId),
            eq(usageCounters.resource, resource)
        ),
        // Simplification: In a real app we would check if now is between periodStart and periodEnd,
        // and create a new counter if the month rolled over.
        // For Phase 5, we assume a single rolling counter or handle it with an upsert.
    });

    if (currentCounter) {
        await db.update(usageCounters)
            .set({ 
                count: currentCounter.count + 1,
                updatedAt: new Date()
            })
            .where(eq(usageCounters.id, currentCounter.id));
    } else {
        // Create new counter
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        await db.insert(usageCounters).values({
            organizationId,
            resource,
            periodStart: now,
            periodEnd: nextMonth,
            count: 1
        });
    }
}
