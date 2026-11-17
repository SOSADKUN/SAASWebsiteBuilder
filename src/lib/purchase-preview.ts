import {
  addService,
  estimatedMonthly,
  systemServices,
  formatServicePrice,
} from "./system-services";
export const publicServiceKeys = [
  "pos",
  "orders",
  "cake_preorders",
  "appointments",
  "staff_availability",
] as const;
export function purchasePreview(keys: readonly string[]) {
  if (
    !keys.length ||
    keys.some(
      (k) =>
        !publicServiceKeys.includes(k as (typeof publicServiceKeys)[number]) ||
        !systemServices.find((s) => s.key === k)?.implemented,
    )
  )
    return null;
  let selected: string[] = [];
  for (const key of new Set(keys)) selected = addService(selected, key);
  return {
    services: systemServices.filter((s) => selected.includes(s.key)),
    keys: selected,
    total: estimatedMonthly(selected),
    canCheckout: false as const,
  };
}
export const purchaseTerms = [
  [
    "Billing period",
    "Proposed: one calendar month from the verified activation timestamp, ending at the same UTC time on the corresponding day of the next month (clamped to that month's final day when needed). The expiry timestamp must be shown before any future payment. Not a 30-day promise. This preview starts no period.",
  ],
  [
    "Activation and expiry",
    "No activation is available here. Future access requires confirmed payment and a verified company-specific service entitlement. Expiry stops new paid-service operations; existing tickets can be safely finished or cancelled under the current order rules.",
  ],
  [
    "Maintenance and security",
    "Proposed for the stated active service period: access to the implemented hosted service and generally released maintenance and security updates. No custom feature development, dedicated infrastructure or guaranteed uptime is included. Final commitments require review before paid launch.",
  ],
  [
    "General support",
    "General product and issue-reporting support through configured contact channels only. No 24/7 coverage, guaranteed response time, training package or custom development is promised.",
  ],
  [
    "Exclusions",
    "No payment processing, online checkout, card or e-wallet collection, automatic refunds, receipt printing, hardware integration, inventory, service appointments or cake pre-orders. POS records cash or unpaid pickup tickets only. A device must be online; updates use polling.",
  ],
  [
    "Renewal",
    "Proposed manual renewal only. No automatic renewal, recurring charge or saved payment method. Future renewal must disclose a fresh exact service period before payment; no renewal can be purchased now.",
  ],
  [
    "Cancellation",
    "No purchase or paid subscription exists to cancel in this preview. Proposed: stop future manual renewal; switching off a service is separate from cancelling a paid period and does not delete records. Active tickets must be resolved first. Final notice and cancellation rules are pending business/legal review.",
  ],
  [
    "Refunds",
    "No money is collected and no refund is processed here. Eligibility, applicable rights, request window and handling procedure must be finalized before paid launch. No blanket no-refund rule or automatic refund promise is made.",
  ],
  [
    "Retention and export",
    "Free Core and tenant-authorized JSON export remain available after trial/service expiry. Existing data is not automatically deleted by expiry. Export contains saved records and media URLs, not image binaries or unsaved edits. Final retention duration, account deletion and discontinuation notice periods need confirmation; indefinite retention is not promised.",
  ],
] as const;

export const posOrdersPrice = formatServicePrice(
  estimatedMonthly(["pos", "orders"]),
);
