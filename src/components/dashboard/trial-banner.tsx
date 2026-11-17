"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  systemTrialAccess,
  type SubscriptionSnapshot,
} from "@/lib/subscription-policy";
import {
  selectedServices,
  systemServices,
  estimatedMonthly,
  formatServicePrice,
} from "@/lib/system-services";
import type { ModuleState } from "@/lib/business-modules";
export function TrialBanner({
  subscription,
  modules,
  onManage,
  onSubscribe,
}: {
  subscription: SubscriptionSnapshot;
  modules: readonly ModuleState[];
  onManage?: () => void;
  onSubscribe?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - start),
      60000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const access = systemTrialAccess({
    ...subscription,
    serverNow: new Date(
      Date.parse(subscription.serverNow) + elapsed,
    ).toISOString(),
  });
  const keys = selectedServices(modules);
  const paid = systemServices.filter(
    (s) => keys.includes(s.key) && (s.monthlyPrice ?? 0) > 0,
  );
  const needsEntitlement = paid.filter(
    (s) =>
      !s.modules.every((key) => {
        const state = modules.find((m) => m.key === key);
        return (
          state?.entitlementSource === "verified" &&
          state.expiresAt !== null &&
          Date.parse(state.expiresAt) >
            Date.parse(subscription.serverNow) + elapsed
        );
      }),
  );
  if (paid.length && !needsEntitlement.length) return null;
  const names = paid.map((s) => s.name);
  return (
    <section
      className={`trial-status-banner ${!access.allowed || access.remainingDays <= 3 ? "trial-reminder" : ""}`}
      aria-label="Trial status"
    >
      <Clock3 size={20} />
      <div>
        <strong>
          {access.allowed
            ? access.remainingDays <= 3
              ? `Your trial ends soon - ${access.remainingDays} days left`
              : `Your System Services trial - ${access.remainingDays} days left`
            : "Your System Services trial has ended"}
        </strong>
        <p>
          {access.allowed
            ? "RM0 due during your trial. "
            : "Free Core stays available. New paid-service operations need a verified service entitlement; existing tickets can be finished. "}
          <br />
          {!access.allowed && (
            <>
              Services requiring entitlement:{" "}
              {needsEntitlement.map((s) => s.name).join(", ") || "None"}. <br />
            </>
          )}
          Trial expiry:{" "}
          {new Date(subscription.trialEndsAt).toLocaleDateString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          (MYT).
          <br />
          Selected paid services: {names.join(", ") || "None"}. Estimated{" "}
          {formatServicePrice(estimatedMonthly(keys))}/month after trial.
          <br />
          No automatic charges.
        </p>
      </div>
      <div className="trial-banner-actions">
        {onManage && (
          <button className="button compact" onClick={onManage}>
            Manage System Services
          </button>
        )}
        {!access.allowed && onSubscribe && (
          <button className="button compact" onClick={onSubscribe}>
            Subscription options
          </button>
        )}
      </div>
    </section>
  );
}
