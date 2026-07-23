import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/**
 * A stub table for queuing emails (e.g. invoices, welcome emails).
 * In a real application, a background worker or cron would poll this.
 */
export const emailQueue = pgTable("email_queue", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
    attempts: integer("attempts").notNull().default(0),
    errorLog: text("error_log"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    sentAt: timestamp('sent_at', { withTimezone: true }),
});

/**
 * A stub table for scheduled background jobs.
 */
export const scheduledJobs = pgTable("scheduled_jobs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    jobName: text("job_name").notNull(), // e.g. "cancel_past_due_subscriptions"
    payload: text("payload"), // JSON payload
    status: text("status", { enum: ['pending', 'running', 'completed', 'failed'] }).notNull().default('pending'),
    runAt: timestamp('run_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    completedAt: timestamp('completed_at', { withTimezone: true }),
});
