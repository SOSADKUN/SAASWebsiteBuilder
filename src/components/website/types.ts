import type { Business, Product, Settings } from "@/lib/models";
export type WebsiteSectionProps = {
  settings: Settings;
  business: Business;
  products: Product[];
};
