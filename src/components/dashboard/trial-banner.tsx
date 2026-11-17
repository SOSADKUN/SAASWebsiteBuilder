"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  subscriptionAccess,
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
  const access = subscriptionAccess({
    ...subscription,
    serverNow: new Date(
      Date.parse(subscription.serverNow) + elapsed,
    ).toISOString(),
  });
  if (access.status === "active") return null;
  const keys = selectedServices(modules);
  const names = systemServices
    .filter((s) => keys.includes(s.key) && (s.monthlyPrice ?? 0) > 0)
    .map((s) => s.name);
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
            : "Your trial has ended"}
        </strong>
        <p>
          {access.allowed
            ? "RM0 due during your trial. "
            : "A valid subscription is required to resume changes. Your records are preserved. "}
          Trial expiry:{" "}
          {new Date(subscription.trialEndsAt).toLocaleDateString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          (MYT). Selected paid services: {names.join(", ") || "None"}. Estimated{" "}
          {formatServicePrice(estimatedMonthly(keys))}/month after trial. No
          automatic charges.
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
