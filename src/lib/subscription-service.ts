import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  merchants,
  merchantSubscriptions,
  subscriptionPlans,
} from "@/db/schema";
import {
  subscriptionAccess,
  type SubscriptionSnapshot,
} from "./subscription-policy";

// Caller must authorize membership before using this internal tenant loader.
export async function subscriptionSnapshot(
  merchantId: string,
): Promise<SubscriptionSnapshot> {
  const [row] = await db()
    .select({
      serverNow: sql<string>`CURRENT_TIMESTAMP::text`,
      trialStartedAt: merchants.trialStartedAt,
      trialEndsAt: merchants.trialEndsAt,
      subscription: merchantSubscriptions,
      planName: subscriptionPlans.name,
    })
    .from(merchants)
    .leftJoin(
      merchantSubscriptions,
      eq(merchants.id, merchantSubscriptions.merchantId),
    )
    .leftJoin(
      subscriptionPlans,
      eq(merchantSubscriptions.planId, subscriptionPlans.id),
    )
    .where(eq(merchants.id, merchantId));
  if (!row || !row.subscription)
    throw new Error(
      "Subscription setup is incomplete. Contact the platform administrator.",
    );
  return {
    serverNow: new Date(row.serverNow).toISOString(),
    trialStartedAt: row.trialStartedAt.toISOString(),
    trialEndsAt: row.trialEndsAt.toISOString(),
    status: row.subscription.status,
    planName: row.planName ?? "SERVQO",
    currentPeriodEndsAt:
      row.subscription.currentPeriodEndsAt?.toISOString() ?? null,
    paymentVerifiedAt:
      row.subscription.paymentVerifiedAt?.toISOString() ?? null,
    verificationSource: row.subscription.verificationSource,
  };
}
export async function requireSubscription(merchantId: string) {
  const snapshot = await subscriptionSnapshot(merchantId);
  if (!subscriptionAccess(snapshot).allowed)
    throw new Error(
      "Subscription required: your trial has ended. View Subscription & Billing to continue. Your data remains available for viewing and export.",
    );
}
