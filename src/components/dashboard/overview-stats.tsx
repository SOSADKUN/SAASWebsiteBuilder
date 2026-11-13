"use client";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Boxes, Users, Wallet } from "lucide-react";
import { overviewMetrics } from "@/server/workspace-actions";
import { formatMoney } from "@/lib/order-policy";

export function OverviewStats({
  merchantId,
  products,
  available,
  collection,
}: {
  merchantId: string;
  products: number;
  available: number;
  collection: number;
}) {
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof overviewMetrics>
  > | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let stopped = false;
    overviewMetrics(merchantId)
      .then((value) => {
        if (!stopped) setResult(value);
      })
      .catch(() => {
        if (!stopped)
          setResult({
            ok: false,
            error: "Dashboard figures are unavailable. Try again.",
            reference: "",
          });
      });
    return () => {
      stopped = true;
    };
  }, [merchantId, attempt]);
  const metrics = result?.ok ? result.data : null;
  return (
    <div className="overview-stats-panel">
      <div className="quick-stats overview-stats">
        <div>
          <span>
            <UtensilsCrossed size={18} /> On the menu
          </span>
          <strong>{products}</strong>
          <small>{available} available products</small>
        </div>
        <div>
          <span>
            <Wallet size={18} /> This month’s revenue
          </span>
          <strong>
            {metrics
              ? formatMoney(metrics.revenue)
              : result
                ? "Unavailable"
                : "Loading…"}
          </strong>
          <small>
            {metrics
              ? `${metrics.completedOrders} completed orders · MYT`
              : "Completed orders · Malaysian calendar month"}
          </small>
        </div>
        <div>
          <span>
            <Boxes size={18} /> Your collection
          </span>
          <strong>{collection}</strong>
          <small>Components ready to use</small>
        </div>
        <div>
          <span>
            <Users size={18} /> Employees
          </span>
          <strong>
            {metrics ? metrics.employees : result ? "Unavailable" : "Loading…"}
          </strong>
          <small>Workspace members, including owner</small>
        </div>
      </div>
      {result && !result.ok && (
        <p className="overview-metrics-error" role="alert">
          {result.error} {result.reference && `Reference: ${result.reference}`}{" "}
          <button
            className="text-button"
            onClick={() => {
              setResult(null);
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
