CREATE TABLE "pos_order_counters" (
	"merchant_id" uuid PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL,
	CONSTRAINT "pos_item_amounts_valid" CHECK ("pos_order_items"."quantity" BETWEEN 1 AND 99 AND "pos_order_items"."unit_price" BETWEEN 0 AND 10000000 AND "pos_order_items"."line_total" = "pos_order_items"."unit_price" * "pos_order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"request_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"fulfillment" text NOT NULL,
	"table_label" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"total" integer NOT NULL,
	"payment" text NOT NULL,
	"cash_received" integer,
	"change_due" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancel_reason" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_acknowledged_at" timestamp with time zone,
	"cancellation_acknowledged_by" uuid,
	CONSTRAINT "pos_order_status_valid" CHECK ("pos_orders"."status" IN ('pending','preparing','ready','completed','cancelled')),
	CONSTRAINT "pos_order_fulfillment_valid" CHECK ("pos_orders"."fulfillment" IN ('dine_in','takeaway')),
	CONSTRAINT "pos_order_payment_valid" CHECK ("pos_orders"."payment" IN ('cash','unpaid')),
	CONSTRAINT "pos_order_amounts_valid" CHECK ("pos_orders"."total" >= 0 AND "pos_orders"."change_due" >= 0 AND ("pos_orders"."cash_received" IS NULL OR "pos_orders"."cash_received" >= "pos_orders"."total")),
	CONSTRAINT "pos_order_cash_valid" CHECK (("pos_orders"."payment" = 'cash' AND "pos_orders"."cash_received" IS NOT NULL AND "pos_orders"."change_due" = "pos_orders"."cash_received" - "pos_orders"."total") OR ("pos_orders"."payment" = 'unpaid' AND "pos_orders"."cash_received" IS NULL AND "pos_orders"."change_due" = 0)),
	CONSTRAINT "pos_order_cancellation_valid" CHECK (("pos_orders"."status" = 'cancelled' AND "pos_orders"."cancelled_at" IS NOT NULL AND "pos_orders"."cancel_reason" IS NOT NULL AND length(trim("pos_orders"."cancel_reason")) >= 3) OR ("pos_orders"."status" <> 'cancelled' AND "pos_orders"."cancelled_at" IS NULL AND "pos_orders"."cancel_reason" IS NULL)),
	CONSTRAINT "pos_order_version_valid" CHECK ("pos_orders"."version" >= 0 AND "pos_orders"."number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pos_order_tenant_id" ON "pos_orders" USING btree ("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "pos_order_counters" ADD CONSTRAINT "pos_order_counters_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_events" ADD CONSTRAINT "pos_event_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "public"."pos_orders"("merchant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_item_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "public"."pos_orders"("merchant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pos_event_version_unique" ON "pos_order_events" USING btree ("order_id","version");--> statement-breakpoint
CREATE INDEX "pos_event_order" ON "pos_order_events" USING btree ("merchant_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_item_product_unique" ON "pos_order_items" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "pos_item_order" ON "pos_order_items" USING btree ("merchant_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_order_number_unique" ON "pos_orders" USING btree ("merchant_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_order_request_unique" ON "pos_orders" USING btree ("merchant_id","request_id");--> statement-breakpoint
CREATE INDEX "pos_order_queue" ON "pos_orders" USING btree ("merchant_id","status","created_at");
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pos_orders','pos_order_items','pos_order_events','pos_order_counters'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  IF t = 'pos_order_counters' THEN
   EXECUTE format('CREATE POLICY pos_counter_private ON public.%I FOR SELECT TO authenticated USING (false)',t);
  ELSE
   EXECUTE format('CREATE POLICY pos_tenant_read ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.merchant_users u WHERE u.merchant_id=%I.merchant_id AND u.user_id=auth.uid()))',t,t);
  END IF;
 END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION public.preserve_pos_order_events() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Order history is append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER preserve_pos_order_events BEFORE UPDATE OR DELETE ON public.pos_order_events FOR EACH ROW EXECUTE FUNCTION public.preserve_pos_order_events();
