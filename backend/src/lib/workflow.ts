import { db } from "@/db";
import { approvalRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createApprovalRequest({
  storeId,
  requesterId,
  actionType,
  referenceId,
  payload,
}: {
  storeId: string;
  requesterId: string;
  actionType: string;
  referenceId: string;
  payload: any;
}) {
  return await db.insert(approvalRequests).values({
    storeId,
    requesterId,
    actionType,
    referenceId,
    payload: JSON.stringify(payload),
    status: "PENDING"
  }).returning();
}
