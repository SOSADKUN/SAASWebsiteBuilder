ALTER TABLE "merchants" ADD COLUMN "onboarding_step" text DEFAULT 'complete' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "onboarding_services" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE public.merchants ADD CONSTRAINT merchant_onboarding_step_valid CHECK (onboarding_step IN ('business_type','services','review','complete'));

--> statement-breakpoint
-- MYR examples only. Availability, licenses and subscription/trial dates do not change.
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','demo','currency','MYR');
--> statement-breakpoint
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','included','currency','MYR','monthlyExample',0) WHERE key IN ('overview','business','settings','website','media','catalog');
--> statement-breakpoint
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','demo','currency','MYR','monthlyExample',2900) WHERE key IN ('pos','fnb_orders','cake_preorders');
--> statement-breakpoint
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','demo','currency','MYR','monthlyExample',0,'bundledWith','fnb_orders') WHERE key='kitchen_queue';
--> statement-breakpoint
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','demo','currency','MYR','monthlyExample',3900) WHERE key='appointments';
--> statement-breakpoint
UPDATE public.business_module_definitions SET pricing = jsonb_build_object('mode','demo','currency','MYR','monthlyExample',1900) WHERE key IN ('staff_availability','inventory');
