import { WebsiteDemo } from "@/components/marketing/website-demo";
import { publicMetadata } from "@/lib/public-site";
export const metadata = publicMetadata(
  "Website Builder demo",
  "Preview real SERVQOO website layouts with sample content. No account or payment required.",
  "/demo",
);
export default function Demo() {
  return (
    <section className="p-section">
      <div className="public-page-title">
        <span className="p-eyebrow">A real layout preview</span>
        <h1>
          Your brand.
          <br />
          Your kind of website.
        </h1>
        <p>
          Switch the header layout and change its color. This public sample
          reuses our existing website renderer; your authenticated editor is
          where you manage sections, save drafts and publish.
        </p>
      </div>
      <WebsiteDemo />
    </section>
  );
}
