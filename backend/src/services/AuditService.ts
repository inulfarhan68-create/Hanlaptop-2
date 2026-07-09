import { db } from '../db';
import { auditLogs } from '../db/schema/audit';
import { NextRequest } from 'next/server';

interface AuditParams {
    storeId: string;
    userId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'EXPORT';
    entity: 'INVENTORY' | 'TRANSACTION' | 'JOURNAL' | 'USER' | 'SETTINGS' | 'REPORT';
    entityId: string;
    oldValue?: any;
    newValue?: any;
    req?: NextRequest;
}

export class AuditService {
    /**
     * Log an action to the audit_logs table.
     * Runs asynchronously (fire-and-forget) to avoid slowing down the main request.
     */
    static async log(params: AuditParams) {
        try {
            // Extract request info safely
            let ipAddress = 'UNKNOWN';
            let userAgent = 'UNKNOWN';
            
            if (params.req) {
                ipAddress = params.req.headers.get('x-forwarded-for') || 
                            params.req.headers.get('x-real-ip') || 
                            'UNKNOWN';
                userAgent = params.req.headers.get('user-agent') || 'UNKNOWN';
            }

            // Stringify values if they exist
            const oldValStr = params.oldValue ? JSON.stringify(params.oldValue) : null;
            const newValStr = params.newValue ? JSON.stringify(params.newValue) : null;

            // We do not `await` this so it doesn't block the caller (fire & forget)
            db.insert(auditLogs).values({
                storeId: params.storeId,
                userId: params.userId,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                oldValue: oldValStr,
                newValue: newValStr,
                ipAddress,
                userAgent,
            }).execute().catch(e => {
                console.error("[AuditService] Failed to insert audit log background task:", e);
            });

        } catch (error) {
            console.error("[AuditService] Error constructing audit log:", error);
        }
    }
}
