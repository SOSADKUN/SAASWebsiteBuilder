export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled" | "expired";
export type SubscriptionSnapshot = {
  serverNow: string;
  trialStartedAt: string;
  trialEndsAt: string;
  status: SubscriptionStatus;
  planName: string;
  currentPeriodEndsAt: string | null;
  paymentVerifiedAt: string | null;
  verificationSource: string | null;
};
export function subscriptionAccess(snapshot: SubscriptionSnapshot) {
  const now = Date.parse(snapshot.serverNow);
  const ends = Date.parse(snapshot.trialEndsAt);
  const trial = now >= Date.parse(snapshot.trialStartedAt) && now < ends;
  const paid =
    snapshot.status === "active" &&
    ["provider", "admin"].includes(snapshot.verificationSource ?? "") &&
    snapshot.paymentVerifiedAt !== null &&
    Date.parse(snapshot.paymentVerifiedAt) <= now &&
    snapshot.currentPeriodEndsAt !== null &&
    Date.parse(snapshot.currentPeriodEndsAt) > now;
  const status: SubscriptionStatus = paid
    ? "active"
    : trial
      ? "trialing"
      : snapshot.status === "trialing" || snapshot.status === "active"
        ? "expired"
        : snapshot.status;
  return {
    allowed: trial || paid,
    status,
    remainingDays: trial ? Math.ceil((ends - now) / 86_400_000) : 0,
  };
}
