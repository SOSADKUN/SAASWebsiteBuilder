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
export async function dashboardData(requiredCapability?: MerchantCapability) {
  const trace = workspaceTrace("dashboard.load");
  return trace.step("load", () => loadDashboardData(requiredCapability));
}
async function loadDashboardData(requiredCapability?: MerchantCapability) {
  const u = await user();
  const database = db();
  const membership = await database.query.memberships.findFirst({
    where: eq(s.memberships.userId, u.id),
  });
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
    database.query.merchants.findFirst({
      where: eq(s.merchants.id, merchantId),
    }),
    database
      .select()
      .from(s.pages)
      .where(eq(s.pages.merchantId, merchantId))
      .orderBy(asc(s.pages.updatedAt)),
    database
      .select()
      .from(s.products)
      .where(eq(s.products.merchantId, merchantId))
      .orderBy(asc(s.products.position)),
    database
      .select()
      .from(s.categories)
      .where(eq(s.categories.merchantId, merchantId))
      .orderBy(asc(s.categories.position)),
    database
      .select()
      .from(s.entitlements)
      .where(eq(s.entitlements.merchantId, merchantId)),
    database.select().from(s.media).where(eq(s.media.merchantId, merchantId)),
    database.select().from(s.componentDefinitions),
    database.select().from(s.storeProducts),
  ]);
  if (!business) throw new Error("Business unavailable");
  return {
    subscription: await subscriptionSnapshot(merchantId),
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
