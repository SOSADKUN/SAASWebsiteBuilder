import "server-only";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { user } from "@/lib/auth";
import { merchantModuleState } from "./module-service";
import {
  moduleAccess,
  businessType,
  capabilityModules,
} from "@/lib/business-modules";
import { dashboardLoadPlan } from "@/lib/dashboard-load-plan";
import { navigationForView } from "@/lib/dashboard-navigation";
import { subscriptionSnapshot } from "@/lib/subscription-service";
import {
  capabilitiesForRole,
  roleHasCapability,
  type MerchantCapability,
} from "@/lib/merchant-capabilities";
export async function dashboardData(
  requiredCapability?: MerchantCapability,
  trace = workspaceTrace("dashboard.load"),
  view = "Overview",
) {
  const data = await trace.step("load", () =>
    loadDashboardData(requiredCapability, trace, view),
  );
  trace.ready(data ? "dashboard" : "onboarding");
  return data;
}
export async function loadMerchantContext(
  requiredCapability: MerchantCapability | undefined,
  trace: ReturnType<typeof workspaceTrace>,
  view: string,
) {
  const u = await trace.step("authentication", () => user());
  const database = db();
  const membership = await trace.step("membership", () =>
    database.query.memberships.findFirst({
      where: eq(s.memberships.userId, u.id),
    }),
  );
  if (!membership) return null;
  // The user and their membership were just validated above. Reuse that
  // server-loaded role instead of repeating Auth and the same membership read.
  const destination = navigationForView(view);
  const required: MerchantCapability[] = [
    requiredCapability ?? "workspace:view",
    destination?.requires ?? "workspace:view",
  ];
  if (
    required.some(
      (capability) => !roleHasCapability(membership.role, capability),
    )
  )
    throw new Error("Workspace permission required");
  const merchantId = membership.merchantId;
  const modules = await trace.step("modules", () =>
    merchantModuleState(merchantId),
  );
  const requiredModules = [
    destination?.moduleKey,
    requiredCapability && capabilityModules[requiredCapability],
  ];
  if (
    requiredModules.some(
      (key) => key && moduleAccess(key, modules) !== "enabled",
    )
  )
    throw new Error("Business module is disabled or not entitled");
  const [business, subscription] = await Promise.all([
    trace.step("business", () =>
      database.query.merchants.findFirst({
        where: eq(s.merchants.id, merchantId),
      }),
    ),
    trace.step("subscription", () => subscriptionSnapshot(merchantId)),
  ]);
  if (!business) throw new Error("Business unavailable");
  return {
    business,
    businessType: businessType(business.businessType),
    modules,
    subscription,
    email: u.email ?? "",
    navigationCapabilities: capabilitiesForRole(membership.role),
  };
}

async function loadDashboardData(
  requiredCapability: MerchantCapability | undefined,
  trace: ReturnType<typeof workspaceTrace>,
  view: string,
) {
  const context = await loadMerchantContext(requiredCapability, trace, view);
  if (!context) return null;
  const database = db();
  const merchantId = context.business.id;
  const plan = dashboardLoadPlan(
    view,
    context.navigationCapabilities,
    context.modules,
  );

  const [pages, products, categories, entitlements, media, catalog, prices] =
    await Promise.all([
      !plan.includes("pages")
        ? Promise.resolve([])
        : trace.step("pages", () =>
            database
              .select()
              .from(s.pages)
              .where(eq(s.pages.merchantId, merchantId))
              .orderBy(asc(s.pages.updatedAt)),
          ),
      !plan.includes("products")
        ? Promise.resolve([])
        : trace.step("products", () =>
            database
              .select()
              .from(s.products)
              .where(eq(s.products.merchantId, merchantId))
              .orderBy(asc(s.products.position)),
          ),
      !plan.includes("categories")
        ? Promise.resolve([])
        : trace.step("categories", () =>
            database
              .select()
              .from(s.categories)
              .where(eq(s.categories.merchantId, merchantId))
              .orderBy(asc(s.categories.position)),
          ),
      !plan.includes("entitlements")
        ? Promise.resolve([])
        : trace.step("entitlements", () =>
            database
              .select()
              .from(s.entitlements)
              .where(eq(s.entitlements.merchantId, merchantId)),
          ),
      !plan.includes("media")
        ? Promise.resolve([])
        : trace.step("media", () =>
            database
              .select()
              .from(s.media)
              .where(eq(s.media.merchantId, merchantId)),
          ),
      !plan.includes("catalog")
        ? Promise.resolve([])
        : trace.step("catalog", () =>
            database.select().from(s.componentDefinitions),
          ),
      !plan.includes("prices")
        ? Promise.resolve([])
        : trace.step("prices", () => database.select().from(s.storeProducts)),
    ]);
  return {
    ...context,
    pages,
    products,
    categories,
    unlocked: entitlements.map((e) => e.componentKey),
    media,
    catalog,
    prices,
  };
}
export async function publicData(slug: string, path = "/") {
  const database = db();
  const business = await database.query.merchants.findFirst({
    where: eq(s.merchants.slug, slug),
  });
  if (!business) return null;
  const page = await database.query.pages.findFirst({
    where: and(eq(s.pages.merchantId, business.id), eq(s.pages.path, path)),
  });
  if (!page?.published) return null;
  const products = await database
    .select()
    .from(s.products)
    .where(
      and(
        eq(s.products.merchantId, business.id),
        eq(s.products.available, true),
      ),
    )
    .orderBy(asc(s.products.position));
  return { business, page, products };
}
