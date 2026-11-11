import { describe, it, expect } from "vitest";
import {
  subscriptionAccess,
  type SubscriptionSnapshot,
} from "../src/lib/subscription-policy";
const trial: SubscriptionSnapshot = {
  serverNow: "2026-11-11T00:00:00Z",
  trialStartedAt: "2026-11-11T00:00:00Z",
  trialEndsAt: "2026-11-25T00:00:00Z",
  status: "trialing",
  planName: "SERVQO",
  currentPeriodEndsAt: null,
  paymentVerifiedAt: null,
  verificationSource: null,
};
describe("merchant subscription policy", () => {
  it("starts with fourteen days and rounds partial days up", () => {
    expect(subscriptionAccess(trial)).toEqual({
      allowed: true,
      status: "trialing",
      remainingDays: 14,
    });
    expect(
      subscriptionAccess({ ...trial, serverNow: "2026-11-24T23:59:59Z" })
        .remainingDays,
    ).toBe(1);
  });
  it("expires at the exact end timestamp without a background job", () => {
    expect(
      subscriptionAccess({ ...trial, serverNow: trial.trialEndsAt }),
    ).toEqual({ allowed: false, status: "expired", remainingDays: 0 });
  });
  it("requires verified unexpired paid service after the trial", () => {
    const paid = {
      ...trial,
      serverNow: trial.trialEndsAt,
      status: "active" as const,
      currentPeriodEndsAt: "2026-12-25T00:00:00Z",
      paymentVerifiedAt: trial.trialEndsAt,
      verificationSource: "provider",
    };
    expect(subscriptionAccess(paid).allowed).toBe(true);
    for (const override of [
      { verificationSource: "demo" },
      { paymentVerifiedAt: null },
      { currentPeriodEndsAt: trial.trialEndsAt },
      { paymentVerifiedAt: "2027-01-01T00:00:00Z" },
    ])
      expect(subscriptionAccess({ ...paid, ...override }).allowed).toBe(false);
    for (const status of ["past_due", "canceled", "expired"] as const)
      expect(subscriptionAccess({ ...paid, status }).allowed).toBe(false);
  });
  it("does not grant access for invalid or future trial timestamps", () => {
    expect(
      subscriptionAccess({ ...trial, serverNow: "2026-11-10T00:00:00Z" })
        .allowed,
    ).toBe(false);
    expect(
      subscriptionAccess({ ...trial, trialEndsAt: "invalid" }).allowed,
    ).toBe(false);
  });
});
