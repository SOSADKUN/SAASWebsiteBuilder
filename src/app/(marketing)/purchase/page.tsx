import { PurchaseSummary } from "@/components/marketing/purchase-summary";
import { publicMetadata } from "@/lib/public-site";
export const metadata = {
  ...publicMetadata(
    "Purchase preview",
    "Review proposed service scope, monthly pricing and draft policies. Payments are disabled.",
    "/purchase",
  ),
  robots: { index: false, follow: true },
};
export default async function Purchase({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { service } = await searchParams;
  return (
    <section className="p-section">
      <div className="public-page-title">
        <span className="p-eyebrow">Know what you&apos;re choosing</span>
        <h1>
          Review before
          <br />
          you commit.
        </h1>
        <p>
          Proposed service scope and terms for review. Payments are not
          connected. This page does not start a trial, create a subscription or
          issue paid access.
        </p>
      </div>
      <PurchaseSummary
        service={
          service === undefined
            ? "pos"
            : typeof service === "string"
              ? service
              : "invalid"
        }
      />
    </section>
  );
}
