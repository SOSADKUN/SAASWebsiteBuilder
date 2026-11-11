import "server-only";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { user } from "@/lib/auth";
import { subscriptionSnapshot } from "@/lib/subscription-service";
import {
  capabilitiesForRole,
  roleHasCapability,
  type MerchantCapability,
} from "@/lib/merchant-capabilities";
export async function dashboardData(
  requiredCapability?: MerchantCapability,
  trace = workspaceTrace("dashboard.load"),
) {
  const data = await trace.step("load", () =>
    loadDashboardData(requiredCapability, trace),
  );
  trace.ready(data ? "dashboard" : "onboarding");
  return data;
}
async function loadDashboardData(
  requiredCapability: MerchantCapability | undefined,
  trace: ReturnType<typeof workspaceTrace>,
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
  if (
    requiredCapability &&
    !roleHasCapability(membership.role, requiredCapability)
  )
    throw new Error("Workspace permission required");
  const merchantId = membership.merchantId;
  const [
    business,
    pages,
    products,
    categories,
    entitlements,
    media,
    catalog,
    prices,
  ] = await Promise.all([
    trace.step("business", () =>
      database.query.merchants.findFirst({
        where: eq(s.merchants.id, merchantId),
      }),
    ),
    trace.step("pages", () =>
      database
        .select()
        .from(s.pages)
        .where(eq(s.pages.merchantId, merchantId))
        .orderBy(asc(s.pages.updatedAt)),
    ),
    trace.step("products", () =>
      database
        .select()
        .from(s.products)
        .where(eq(s.products.merchantId, merchantId))
        .orderBy(asc(s.products.position)),
    ),
    trace.step("categories", () =>
      database
        .select()
        .from(s.categories)
        .where(eq(s.categories.merchantId, merchantId))
        .orderBy(asc(s.categories.position)),
    ),
    trace.step("entitlements", () =>
      database
        .select()
        .from(s.entitlements)
        .where(eq(s.entitlements.merchantId, merchantId)),
    ),
    trace.step("media", () =>
      database.select().from(s.media).where(eq(s.media.merchantId, merchantId)),
    ),
    trace.step("catalog", () => database.select().from(s.componentDefinitions)),
    trace.step("prices", () => database.select().from(s.storeProducts)),
  ]);
  if (!business) throw new Error("Business unavailable");
  return {
    subscription: await trace.step("subscription", () =>
      subscriptionSnapshot(merchantId),
    ),
    business,
    pages,
    products,
    categories,
    unlocked: entitlements.map((e) => e.componentKey),
    media,
    catalog,
    prices,
    email: u.email ?? "",
    navigationCapabilities: capabilitiesForRole(membership.role),
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
