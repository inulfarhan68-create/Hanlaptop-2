CREATE TABLE "service_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"service_order_id" text NOT NULL,
	"inventory_id" text,
	"item_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" double precision DEFAULT 0 NOT NULL,
	"cost_price" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_parts_service_order_idx" ON "service_parts" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "service_parts_inventory_idx" ON "service_parts" USING btree ("inventory_id");