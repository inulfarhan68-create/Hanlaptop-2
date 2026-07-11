CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text DEFAULT 'kasir' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"store_id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"store_name" text DEFAULT 'HanLaptop' NOT NULL,
	"store_address" text DEFAULT 'Jl. Komputer Raya No.123' NOT NULL,
	"store_phone" text DEFAULT '0812-3456-7890' NOT NULL,
	"store_logo" text,
	"store_signature" text,
	"store_footer" text DEFAULT 'Terima kasih atas kunjungan Anda.
Barang yang sudah dibeli
tidak dapat ditukar/dikembalikan.',
	"wa_template_piutang" text DEFAULT 'Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih.',
	"wa_template_umum" text DEFAULT 'Halo Kak {nama}, ini dengan *{toko}*. ',
	"wa_template_nota" text,
	"wa_template_service_diterima" text,
	"wa_template_service_dikerjakan" text,
	"wa_template_service_menunggu_part" text,
	"wa_template_service_selesai" text,
	"wa_template_service_batal" text,
	"store_banks" text,
	"enable_cashier_shift" boolean DEFAULT true NOT NULL,
	"expense_categories" text,
	"service_issues" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"slug" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_store_access" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"store_id" text NOT NULL,
	"role" text DEFAULT 'kasir' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"item_name" text NOT NULL,
	"category" text NOT NULL,
	"specs" text,
	"barcode" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 2 NOT NULL,
	"cost_price" double precision DEFAULT 0 NOT NULL,
	"selling_price" double precision DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"condition" text DEFAULT 'NEW' NOT NULL,
	"is_consignment" boolean DEFAULT false NOT NULL,
	"consignment_commission_rate" double precision DEFAULT 10,
	"supplier_id" text,
	"image_url" text,
	"tracks_serial_number" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "quantity_check" CHECK ("inventory"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "qc_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_id" text NOT NULL,
	"passport_id" text,
	"technician_id" text NOT NULL,
	"grade" text NOT NULL,
	"screen_score" integer DEFAULT 100,
	"battery_health" integer DEFAULT 100,
	"battery_cycle" integer,
	"keyboard_score" integer DEFAULT 100,
	"usb_ports_score" integer DEFAULT 100,
	"hinge_score" integer DEFAULT 100,
	"wifi_score" integer DEFAULT 100,
	"body_score" integer DEFAULT 100,
	"touchpad_status" text DEFAULT 'NOT_TESTED',
	"speaker_status" text DEFAULT 'NOT_TESTED',
	"mic_status" text DEFAULT 'NOT_TESTED',
	"bluetooth_status" text DEFAULT 'NOT_TESTED',
	"webcam_status" text DEFAULT 'NOT_TESTED',
	"hdmi_status" text DEFAULT 'NOT_TESTED',
	"charging_status" text DEFAULT 'NOT_TESTED',
	"fingerprint_status" text DEFAULT 'NOT_TESTED',
	"max_selling_price" double precision,
	"warranty_days" integer,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opname_items" (
	"id" text PRIMARY KEY NOT NULL,
	"opname_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"system_qty" integer NOT NULL,
	"physical_qty" integer NOT NULL,
	"difference" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"status" text DEFAULT 'HADIR' NOT NULL,
	"photo_in" text,
	"photo_out" text,
	"location_in" text,
	"location_out" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashier_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_balance" double precision DEFAULT 0 NOT NULL,
	"closing_balance" double precision,
	"expected_balance" double precision,
	"difference" double precision,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "employee_loans" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"paid_amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"description" text,
	"loan_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"role" text DEFAULT 'Lainnya' NOT NULL,
	"user_id" text,
	"technician_id" text,
	"basic_salary" double precision DEFAULT 0 NOT NULL,
	"allowance" double precision DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"period" text NOT NULL,
	"basic_salary" double precision DEFAULT 0 NOT NULL,
	"allowance" double precision DEFAULT 0 NOT NULL,
	"commissions" double precision DEFAULT 0 NOT NULL,
	"overtime" double precision DEFAULT 0 NOT NULL,
	"deductions" double precision DEFAULT 0 NOT NULL,
	"net_salary" double precision DEFAULT 0 NOT NULL,
	"payment_method" text DEFAULT 'Cash' NOT NULL,
	"payment_status" text DEFAULT 'UNPAID' NOT NULL,
	"paid_at" timestamp with time zone,
	"payout_transaction_id" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" double precision NOT NULL,
	"estimated_cost" double precision NOT NULL,
	"supplier_name" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technician_commissions" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"technician_id" text NOT NULL,
	"service_order_id" text NOT NULL,
	"transaction_id" text,
	"service_amount" double precision DEFAULT 0 NOT NULL,
	"parts_amount" double precision DEFAULT 0 NOT NULL,
	"commission_amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"paid_at" timestamp with time zone,
	"payout_transaction_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"commission_type" text DEFAULT 'percentage' NOT NULL,
	"commission_value" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyback_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"brand" text NOT NULL,
	"processor" text NOT NULL,
	"ram" text NOT NULL,
	"storage" text NOT NULL,
	"condition" text NOT NULL,
	"completeness" text NOT NULL,
	"estimated_market_price" double precision DEFAULT 0 NOT NULL,
	"estimated_offer_price_min" double precision DEFAULT 0 NOT NULL,
	"estimated_offer_price_max" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"type" text DEFAULT 'JUAL_LAPTOP' NOT NULL,
	"target_laptop_name" text,
	"target_laptop_price" double precision,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_phone" text,
	"type" text NOT NULL,
	"scheduled_date" text NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "membership_points" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"points" double precision DEFAULT 0 NOT NULL,
	"history" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "membership_points_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"customer_address" text,
	"device_name" text NOT NULL,
	"issue" text NOT NULL,
	"status" text DEFAULT 'Diterima' NOT NULL,
	"technician_name" text,
	"technician_id" text,
	"estimated_cost" double precision DEFAULT 0,
	"final_cost" double precision DEFAULT 0,
	"received_date" timestamp with time zone NOT NULL,
	"completed_date" timestamp with time zone,
	"warranty_until" timestamp with time zone,
	"notes" text,
	"warranty_claimed" boolean DEFAULT false,
	"original_transaction_id" text,
	"rating" integer,
	"rating_comment" text,
	"rating_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_pricing_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"specs" text NOT NULL,
	"condition" text NOT NULL,
	"recommended_buy_price" double precision NOT NULL,
	"recommended_sell_price" double precision NOT NULL,
	"confidence_score" integer NOT NULL,
	"reasoning" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"requester_id" text NOT NULL,
	"action_type" text NOT NULL,
	"reference_id" text,
	"payload" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"approver_id" text,
	"approval_notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_mutations" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"date" text NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"type" text NOT NULL,
	"reconciled" integer DEFAULT 0 NOT NULL,
	"reconciled_transaction_id" text,
	"reconciled_service_order_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_payables" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"transaction_id" text,
	"amount_due" double precision NOT NULL,
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_lifecycle_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"passport_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" text,
	"reference_id" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_passports" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"serial_number" text NOT NULL,
	"inventory_id" text NOT NULL,
	"status" text DEFAULT 'PROCURED' NOT NULL,
	"grade" text DEFAULT 'NEW' NOT NULL,
	"current_transaction_id" text,
	"original_cost" double precision DEFAULT 0 NOT NULL,
	"warranty_end_date" timestamp with time zone,
	"imei" text,
	"mac_address" text,
	"windows_key" text,
	"battery_serial" text,
	"motherboard_serial" text,
	"battery_health" integer,
	"battery_cycle" integer,
	"health_score" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"transaction_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_code" text,
	"debit" double precision DEFAULT 0 NOT NULL,
	"credit" double precision DEFAULT 0 NOT NULL,
	"is_voided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "debit_check" CHECK ("journal_entries"."debit" >= 0),
	CONSTRAINT "credit_check" CHECK ("journal_entries"."credit" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_number" text NOT NULL,
	"source_store_id" text NOT NULL,
	"target_store_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_by_user_name" text NOT NULL,
	"approved_by_user_id" text,
	"approved_by_user_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"inventory_id" text,
	"quantity" integer NOT NULL,
	"unit_price" double precision NOT NULL,
	"serial_numbers" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" double precision NOT NULL,
	"description" text,
	"transaction_date" timestamp with time zone NOT NULL,
	"invoice_number" text,
	"customer_name" text,
	"customer_id" text,
	"supplier_id" text,
	"payment_method" text,
	"payment_status" text,
	"dp_amount" double precision DEFAULT 0,
	"discount_amount" double precision DEFAULT 0,
	"due_date" timestamp with time zone,
	"original_transaction_id" text,
	"user_id" text,
	"shift_id" text,
	"is_voided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claim_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost_price" double precision NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"passport_id" text,
	"technician_id" text,
	"service_order_id" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"issue_description" text NOT NULL,
	"resolution_notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sub_type" text,
	"parent_id" text,
	"opening_balance" double precision DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"normal_balance" text DEFAULT 'Debit' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closing_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"fiscal_period_id" text NOT NULL,
	"closing_type" text NOT NULL,
	"closed_by" text NOT NULL,
	"revenue_entries" text,
	"expense_entries" text,
	"net_income" double precision DEFAULT 0 NOT NULL,
	"income_summary_account" text NOT NULL,
	"retained_earnings_account" text NOT NULL,
	"closing_journal_entry_id" text,
	"retained_earnings_journal_entry_id" text,
	"closed_at" timestamp with time zone NOT NULL,
	"notes" text,
	CONSTRAINT "closing_entries_fiscal_period_id_unique" UNIQUE("fiscal_period_id")
);
--> statement-breakpoint
CREATE TABLE "depreciation_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"fixed_asset_id" text NOT NULL,
	"fiscal_period_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"cumulative_amount" double precision NOT NULL,
	"net_book_value" double precision NOT NULL,
	"journal_entry_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"closed_by" text,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"account_code" text NOT NULL,
	"accumulated_depreciation_account" text NOT NULL,
	"depreciation_expense_account" text NOT NULL,
	"purchase_date" text NOT NULL,
	"purchase_price" double precision NOT NULL,
	"useful_life_months" integer NOT NULL,
	"salvage_value" double precision DEFAULT 0 NOT NULL,
	"depreciation_method" text DEFAULT 'straight_line' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"disposed_date" text,
	"disposed_notes" text,
	"disposed_proceeds" double precision DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_refurbishments" (
	"id" text PRIMARY KEY NOT NULL,
	"passport_id" text NOT NULL,
	"store_id" text DEFAULT 'default' NOT NULL,
	"technician_id" text,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"cost" double precision DEFAULT 0,
	"component_replaced" text,
	"old_spec" text,
	"new_spec" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_store_access" ADD CONSTRAINT "user_store_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_store_access" ADD CONSTRAINT "user_store_access_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_payout_transaction_id_transactions_id_fk" FOREIGN KEY ("payout_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requester_id_employees_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_commissions" ADD CONSTRAINT "technician_commissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_commissions" ADD CONSTRAINT "technician_commissions_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_commissions" ADD CONSTRAINT "technician_commissions_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_commissions" ADD CONSTRAINT "technician_commissions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_commissions" ADD CONSTRAINT "technician_commissions_payout_transaction_id_transactions_id_fk" FOREIGN KEY ("payout_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyback_leads" ADD CONSTRAINT "buyback_leads_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_reminders" ADD CONSTRAINT "crm_reminders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_reminders" ADD CONSTRAINT "crm_reminders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_points" ADD CONSTRAINT "membership_points_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_mutations" ADD CONSTRAINT "bank_mutations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_mutations" ADD CONSTRAINT "bank_mutations_reconciled_transaction_id_transactions_id_fk" FOREIGN KEY ("reconciled_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_mutations" ADD CONSTRAINT "bank_mutations_reconciled_service_order_id_service_orders_id_fk" FOREIGN KEY ("reconciled_service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_payables" ADD CONSTRAINT "consignment_payables_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_payables" ADD CONSTRAINT "consignment_payables_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_payables" ADD CONSTRAINT "consignment_payables_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_payables" ADD CONSTRAINT "consignment_payables_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_lifecycle_logs" ADD CONSTRAINT "device_lifecycle_logs_passport_id_device_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."device_passports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_lifecycle_logs" ADD CONSTRAINT "device_lifecycle_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_passports" ADD CONSTRAINT "device_passports_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_passports" ADD CONSTRAINT "device_passports_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_passports" ADD CONSTRAINT "device_passports_current_transaction_id_transactions_id_fk" FOREIGN KEY ("current_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_store_id_stores_id_fk" FOREIGN KEY ("source_store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_target_store_id_stores_id_fk" FOREIGN KEY ("target_store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shift_id_cashier_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cashier_shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claim_parts" ADD CONSTRAINT "warranty_claim_parts_claim_id_warranty_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."warranty_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claim_parts" ADD CONSTRAINT "warranty_claim_parts_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_passport_id_device_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."device_passports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_entries" ADD CONSTRAINT "closing_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_entries" ADD CONSTRAINT "closing_entries_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_entries" ADD CONSTRAINT "closing_entries_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fixed_asset_id_fixed_assets_id_fk" FOREIGN KEY ("fixed_asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_refurbishments" ADD CONSTRAINT "device_refurbishments_passport_id_device_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."device_passports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_refurbishments" ADD CONSTRAINT "device_refurbishments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_refurbishments" ADD CONSTRAINT "device_refurbishments_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_store_id_idx" ON "activity_logs" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_slug_idx" ON "stores" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_store_access_user_idx" ON "user_store_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_store_access_store_idx" ON "user_store_access" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "inventory_store_id_idx" ON "inventory" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_deleted_at_idx" ON "inventory" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "inventory_barcode_idx" ON "inventory" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "inventory_condition_idx" ON "inventory" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "inventory_published_idx" ON "inventory" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "inventory_store_active_idx" ON "inventory" USING btree ("store_id","deleted_at");--> statement-breakpoint
CREATE INDEX "qc_inspections_inventory_id_idx" ON "qc_inspections" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "qc_inspections_passport_id_idx" ON "qc_inspections" USING btree ("passport_id");--> statement-breakpoint
CREATE INDEX "qc_inspections_technician_id_idx" ON "qc_inspections" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "qc_inspections_created_at_idx" ON "qc_inspections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_opname_items_opname_id_idx" ON "stock_opname_items" USING btree ("opname_id");--> statement-breakpoint
CREATE INDEX "stock_opnames_store_id_idx" ON "stock_opnames" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "attendances_store_id_idx" ON "attendances" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "attendances_employee_id_idx" ON "attendances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "attendances_date_idx" ON "attendances" USING btree ("date");--> statement-breakpoint
CREATE INDEX "cashier_shifts_store_id_idx" ON "cashier_shifts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "cashier_shifts_user_id_idx" ON "cashier_shifts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_loans_store_id_idx" ON "employee_loans" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "employee_loans_employee_id_idx" ON "employee_loans" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employees_store_id_idx" ON "employees" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_tech_id_idx" ON "employees" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "payrolls_store_id_idx" ON "payrolls" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "payrolls_employee_id_idx" ON "payrolls" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payrolls_period_idx" ON "payrolls" USING btree ("period");--> statement-breakpoint
CREATE INDEX "purchase_requisitions_store_id_idx" ON "purchase_requisitions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "purchase_requisitions_status_idx" ON "purchase_requisitions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "technician_commission_store_id_idx" ON "technician_commissions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "technician_commission_tech_id_idx" ON "technician_commissions" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "technician_commission_so_id_idx" ON "technician_commissions" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "technician_store_id_idx" ON "technicians" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "buyback_leads_store_id_idx" ON "buyback_leads" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "buyback_leads_status_idx" ON "buyback_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "buyback_leads_type_idx" ON "buyback_leads" USING btree ("type");--> statement-breakpoint
CREATE INDEX "crm_reminders_store_id_idx" ON "crm_reminders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "crm_reminders_customer_id_idx" ON "crm_reminders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "crm_reminders_status_idx" ON "crm_reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_store_id_idx" ON "customers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "membership_points_customer_id_idx" ON "membership_points" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_orders_store_id_idx" ON "service_orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "supplier_store_id_idx" ON "suppliers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "approval_requests_store_id_idx" ON "approval_requests" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_mutations_store_id_idx" ON "bank_mutations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "bank_mutations_reconciled_idx" ON "bank_mutations" USING btree ("reconciled");--> statement-breakpoint
CREATE INDEX "consignment_payables_store_id_idx" ON "consignment_payables" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "consignment_payables_supplier_id_idx" ON "consignment_payables" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "consignment_payables_status_idx" ON "consignment_payables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "device_lifecycle_logs_passport_idx" ON "device_lifecycle_logs" USING btree ("passport_id");--> statement-breakpoint
CREATE INDEX "device_lifecycle_logs_reference_idx" ON "device_lifecycle_logs" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_passports_sn_store_idx" ON "device_passports" USING btree ("serial_number","store_id");--> statement-breakpoint
CREATE INDEX "device_passports_inventory_idx" ON "device_passports" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "device_passports_status_idx" ON "device_passports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "journal_entries_store_id_idx" ON "journal_entries" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "journal_entries_tx_id_idx" ON "journal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "journal_entries_created_at_idx" ON "journal_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "journal_entries_account_code_idx" ON "journal_entries" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "stock_transfer_items_transfer_idx" ON "stock_transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "stock_transfer_source_store_idx" ON "stock_transfers" USING btree ("source_store_id");--> statement-breakpoint
CREATE INDEX "stock_transfer_target_store_idx" ON "stock_transfers" USING btree ("target_store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_transfer_number_idx" ON "stock_transfers" USING btree ("transfer_number");--> statement-breakpoint
CREATE INDEX "transaction_items_tx_id_idx" ON "transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_items_inv_id_idx" ON "transaction_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "transaction_store_id_idx" ON "transactions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "transaction_customer_id_idx" ON "transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_store_invoice_idx" ON "transactions" USING btree ("store_id","invoice_number");--> statement-breakpoint
CREATE INDEX "transaction_is_voided_idx" ON "transactions" USING btree ("is_voided");--> statement-breakpoint
CREATE INDEX "transaction_type_idx" ON "transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "transaction_payment_status_idx" ON "transactions" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "transaction_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_store_id_idx" ON "warranty_claims" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_transaction_id_idx" ON "warranty_claims" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_passport_id_idx" ON "warranty_claims" USING btree ("passport_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_technician_id_idx" ON "warranty_claims" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_status_idx" ON "warranty_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warranty_claims_customer_id_idx" ON "warranty_claims" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "coa_store_id_idx" ON "chart_of_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coa_store_code_idx" ON "chart_of_accounts" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "coa_parent_idx" ON "chart_of_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "coa_type_idx" ON "chart_of_accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "coa_active_idx" ON "chart_of_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ce_store_id_idx" ON "closing_entries" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_fiscal_period_idx" ON "closing_entries" USING btree ("fiscal_period_id");--> statement-breakpoint
CREATE INDEX "ce_closed_by_idx" ON "closing_entries" USING btree ("closed_by");--> statement-breakpoint
CREATE INDEX "de_store_id_idx" ON "depreciation_entries" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "de_asset_period_idx" ON "depreciation_entries" USING btree ("fixed_asset_id","fiscal_period_id");--> statement-breakpoint
CREATE INDEX "de_fiscal_period_idx" ON "depreciation_entries" USING btree ("fiscal_period_id");--> statement-breakpoint
CREATE INDEX "de_journal_entry_idx" ON "depreciation_entries" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "fp_store_id_idx" ON "fiscal_periods" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fp_store_year_month_idx" ON "fiscal_periods" USING btree ("store_id","year","month");--> statement-breakpoint
CREATE INDEX "fp_status_idx" ON "fiscal_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fp_closed_by_idx" ON "fiscal_periods" USING btree ("closed_by");--> statement-breakpoint
CREATE INDEX "fa_store_id_idx" ON "fixed_assets" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fa_code_idx" ON "fixed_assets" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "fa_status_idx" ON "fixed_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fa_account_code_idx" ON "fixed_assets" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "device_refurbishments_passport_idx" ON "device_refurbishments" USING btree ("passport_id");--> statement-breakpoint
CREATE INDEX "device_refurbishments_store_idx" ON "device_refurbishments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "device_refurbishments_technician_idx" ON "device_refurbishments" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "device_refurbishments_activity_idx" ON "device_refurbishments" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_store_id_idx" ON "audit_logs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_store_created_idx" ON "audit_logs" USING btree ("store_id","created_at");