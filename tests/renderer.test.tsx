import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WebsiteRenderer,
  componentRegistry,
} from "../src/components/website/registry";
import {
  defaultSettings,
  definitions,
  initialLayout,
  type Product,
} from "../src/lib/models";
const business = {
  id: "merchant-a",
  name: "Acorn Café",
  slug: "acorn",
  description: "",
  address: "Bangsar, KL",
  hours: "9am–5pm",
  phone: "60123456789",
};
describe("shared public renderer", () => {
  it("has a trusted latest implementation for every catalog definition", () => {
    for (const definition of definitions)
      expect(
        componentRegistry[definition.key]?.[definition.version],
      ).toBeTypeOf("function");
  });
  it("renders merchant products and hides unavailable products and sections", () => {
    const sections = initialLayout(business.name).filter((s) =>
      ["menu-grid", "about-story"].includes(s.key),
    );
    sections[1].visible = true;
    sections[0].visible = false;
    const products: Product[] = [
      {
        id: "coffee",
        name: "Merchant-specific coffee",
        description: "Fresh roast",
        price: 1250,
        image: "",
        categoryId: "coffee",
        available: true,
        position: 0,
      },
      {
        id: "secret",
        name: "Unavailable item",
        description: "",
        price: 1,
        image: "",
        categoryId: "coffee",
        available: false,
        position: 1,
      },
    ];
    const html = renderToStaticMarkup(
      <WebsiteRenderer
        sections={sections}
        business={business}
        products={products}
      />,
    );
    expect(html).toContain("Merchant-specific coffee");
    expect(html).toContain("RM 12.50");
    expect(html).not.toContain("Unavailable item");
    expect(html).not.toContain("Your everyday");
  });
  it("escapes merchant text and handles missing versions gracefully", () => {
    const sections = initialLayout(business.name).slice(0, 1);
    sections[0].settings.title = "<script>alert(1)</script>";
    let html = renderToStaticMarkup(
      <WebsiteRenderer sections={sections} business={business} products={[]} />,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    sections[0].key = "removed-component";
    html = renderToStaticMarkup(
      <WebsiteRenderer sections={sections} business={business} products={[]} />,
    );
    expect(html).toContain("currently unavailable");
  });
  it("uses the merchant’s configured WhatsApp number", () => {
    const html = renderToStaticMarkup(
      <WebsiteRenderer
        sections={[
          {
            id: "order",
            key: "ordering-cta",
            version: 1,
            visible: true,
            settings: defaultSettings("ordering-cta"),
          },
        ]}
        business={business}
        products={[]}
      />,
    );
    expect(html).toContain("https://wa.me/60123456789");
  });
});
