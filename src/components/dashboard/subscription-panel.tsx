"use client";
import { useState } from "react";
import Link from "next/link";
import {
  systemTrialAccess,
  type SubscriptionSnapshot,
} from "@/lib/subscription-policy";
function date(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
export function SubscriptionPanel({
  subscription,
  merchantId,
}: {
  subscription: SubscriptionSnapshot;
  merchantId: string;
}) {
  const access = systemTrialAccess(subscription);
  const [demo, setDemo] = useState(false);
  return (
    <section
      className="subscription-panel"
      aria-labelledby="subscription-heading"
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SERVQOO SUBSCRIPTION</span>
          <h1 id="subscription-heading">Subscription & Billing</h1>
          <p>
            Free Core for your company. Service entitlements are shared by
            authorized members.
          </p>
        </div>
        <span className="pill">{access.status.replaceAll("_", " ")}</span>
      </div>
      {!access.allowed && (
        <div className="notice" role="status">
          <strong>Free Core remains available</strong>
          <p>
            Your service trial has ended. Dashboard, business profile, catalog,
            media and editing/publishing your one website remain free. New
            paid-service operations require a verified service entitlement.
            Existing tickets and historical data are preserved.
          </p>
        </div>
      )}
      <div className="subscription-summary">
        <h2>Permanent Free Core</h2>
        <p>
          One website with multiple pages, basic catalog and quota-limited
          media. Premium designs need separate design ownership. A base
          subscription does not unlock every service.
        </p>
        <dl>
          <div>
            <dt>System Services trial</dt>
            <dd>{access.status.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Trial remaining</dt>
            <dd>{access.remainingDays} days</dd>
          </div>
          <div>
            <dt>Trial started</dt>
            <dd>{date(subscription.trialStartedAt)} UTC</dd>
          </div>
          <div>
            <dt>Trial expires</dt>
            <dd>{date(subscription.trialEndsAt)} UTC</dd>
          </div>
          {subscription.currentPeriodEndsAt && (
            <div>
              <dt>Paid period ends</dt>
              <dd>{date(subscription.currentPeriodEndsAt)} UTC</dd>
            </div>
          )}
        </dl>
        <p className="subscription-note">
          Status checked using server time: {date(subscription.serverNow)} UTC.
          Refresh to update. Logging in or adding team members never restarts
          your trial.
        </p>
        <button className="button primary" onClick={() => setDemo(true)}>
          Subscription options
        </button>
        {demo && (
          <div className="notice" role="status">
            <b>Payments are not connected yet.</b>
            <p>
              This is a subscription preview. No payment was collected and your
              subscription status has not changed. Subscription activation will
              require verified payment integration.
            </p>
          </div>
        )}
      </div>
      <div className="subscription-summary">
        <h2>Your data stays yours</h2>
        <p>
          You can sign in, browse your saved content, update your business
          information and export your data even after expiry.
        </p>
        <div className="subscription-links">
          <Link
            className="button"
            prefetch={false}
            href={`/dashboard/export?merchantId=${encodeURIComponent(merchantId)}`}
          >
            Export business data (JSON)
          </Link>
          <Link className="button" href="/dashboard">
            Back to overview
          </Link>
        </div>
        <p className="subscription-note">
          The export includes saved business data and media URLs. Download
          original uploaded images separately; unsaved editor changes are not
          included.
        </p>
      </div>
    </section>
  );
}
