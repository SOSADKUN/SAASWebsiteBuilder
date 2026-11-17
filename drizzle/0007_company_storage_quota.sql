CREATE TABLE "media_upload_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"path" text NOT NULL,
	"bytes" integer NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_upload_reservations_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "merchant_storage_entitlements" (
	"merchant_id" uuid PRIMARY KEY NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_upload_reservations" ADD CONSTRAINT "media_upload_reservations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_storage_entitlements" ADD CONSTRAINT "merchant_storage_entitlements_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.media_upload_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_storage_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_upload_reservations,public.merchant_storage_entitlements FROM PUBLIC,anon,authenticated;
