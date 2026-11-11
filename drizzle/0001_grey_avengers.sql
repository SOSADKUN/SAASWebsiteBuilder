CREATE UNIQUE INDEX "category_tenant_id" ON "menu_categories" USING btree ("merchant_id","id");--> statement-breakpoint
CREATE INDEX "category_merchant" ON "menu_categories" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "media_merchant" ON "media_assets" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "section_merchant_page" ON "page_sections" USING btree ("merchant_id","page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_tenant_id" ON "pages" USING btree ("merchant_id","id");--> statement-breakpoint
CREATE INDEX "revision_merchant_page" ON "website_revisions" USING btree ("merchant_id","page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "website_tenant_id" ON "websites" USING btree ("merchant_id","id");--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "section_page_tenant_fk" FOREIGN KEY ("merchant_id","page_id") REFERENCES "public"."pages"("merchant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "section_registered_version_fk" FOREIGN KEY ("component_key","version") REFERENCES "public"."component_versions"("component_key","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "page_website_tenant_fk" FOREIGN KEY ("merchant_id","website_id") REFERENCES "public"."websites"("merchant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_products" ADD CONSTRAINT "product_category_tenant_fk" FOREIGN KEY ("merchant_id","category_id") REFERENCES "public"."menu_categories"("merchant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_revisions" ADD CONSTRAINT "revision_page_tenant_fk" FOREIGN KEY ("merchant_id","page_id") REFERENCES "public"."pages"("merchant_id","id") ON DELETE cascade ON UPDATE no action;
