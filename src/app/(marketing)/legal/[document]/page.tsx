import { notFound } from "next/navigation";
import Link from "next/link";
import { legalPages, type LegalKey } from "@/lib/legal-content";
import { publicMetadata } from "@/lib/public-site";
function documentFor(key: string) {
  return Object.hasOwn(legalPages, key) ? legalPages[key as LegalKey] : null;
}
export function generateStaticParams() {
  return Object.keys(legalPages).map((document) => ({ document }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const content = documentFor(document);
  if (!content) return {};
  return {
    ...publicMetadata(
      content.title,
      "Draft SERVQOO policy pending human/legal review. Payments are disabled.",
      `/legal/${document}`,
    ),
    robots: { index: false, follow: true },
  };
}
export default async function Legal({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const content = documentFor(document);
  if (!content) notFound();
  return (
    <article className="p-section public-legal">
      <div className="public-page-title">
        <span className="p-eyebrow">Draft - not legally reviewed</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </div>
      <div className="p-notice">
        <b>Human/legal review required before paid launch.</b>
        <p>
          Bracketed content is unconfirmed and must be replaced by the business
          owner. No company registration details or legal approval have been
          invented. Effective date: [TO BE CONFIRMED].
        </p>
      </div>
      {content.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <p className="p-muted">
        Related: <Link href="/pricing">Pricing</Link> |{" "}
        <Link href="/contact">Contact SERVQOO</Link> |{" "}
        <Link href="/legal/subscription">Subscription Terms</Link>
      </p>
    </article>
  );
}
