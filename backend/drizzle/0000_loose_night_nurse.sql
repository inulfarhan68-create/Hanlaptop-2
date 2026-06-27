CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`specs` text,
	`barcode` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`cost_price` real DEFAULT 0 NOT NULL,
	`selling_price` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_barcode_unique` ON `inventory` (`barcode`);--> statement-breakpoint
CREATE INDEX `inventory_category_idx` ON `inventory` (`category`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_name` text NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `journal_entries_tx_id_idx` ON `journal_entries` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_created_at_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE TABLE `service_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`customer_phone` text,
	`device_name` text NOT NULL,
	`issue` text NOT NULL,
	`status` text DEFAULT 'Diterima' NOT NULL,
	`technician_name` text,
	`estimated_cost` real DEFAULT 0,
	`final_cost` real DEFAULT 0,
	`received_date` integer NOT NULL,
	`completed_date` integer,
	`warranty_until` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`store_name` text DEFAULT 'HanLaptop' NOT NULL,
	`store_address` text DEFAULT 'Jl. Komputer Raya No.123' NOT NULL,
	`store_phone` text DEFAULT '0812-3456-7890' NOT NULL,
	`store_logo` text,
	`store_signature` text,
	`store_footer` text DEFAULT 'Terima kasih atas kunjungan Anda.
Barang yang sudah dibeli
tidak dapat ditukar/dikembalikan.',
	`wa_template_piutang` text DEFAULT 'Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih.',
	`wa_template_umum` text DEFAULT 'Halo Kak {nama}, ini dengan *{toko}*. ',
	`wa_template_nota` text,
	`store_banks` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`inventory_id` text,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transaction_items_tx_id_idx` ON `transaction_items` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_items_inv_id_idx` ON `transaction_items` (`inventory_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`transaction_date` integer NOT NULL,
	`invoice_number` text,
	`customer_name` text,
	`customer_id` text,
	`payment_method` text,
	`payment_status` text,
	`dp_amount` real DEFAULT 0,
	`discount_amount` real DEFAULT 0,
	`due_date` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_invoice_number_unique` ON `transactions` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `transaction_customer_id_idx` ON `transactions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`role` text DEFAULT 'kasir' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
