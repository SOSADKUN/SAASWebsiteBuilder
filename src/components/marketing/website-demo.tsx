"use client";
import { useState } from "react";
import Link from "next/link";
import { WebsiteRenderer } from "@/components/website/registry";
import {
  defaultSettings,
  type Section,
  type Business,
  type Product,
  type ComponentKey,
} from "@/lib/models";
const business: Business = {
  id: "demo",
  name: "Daybreak Coffee",
  slug: "sample-only",
  description: "Your local coffee spot.",
  address: "",
  hours: "",
  phone: "",
};
const products: Product[] = [
  {
    id: "1",
    name: "House latte",
    description: "Espresso, milk, a slower moment.",
    price: 1200,
    image: "",
    categoryId: "coffee",
    available: true,
    position: 0,
  },
  {
    id: "2",
    name: "Butter croissant",
    description: "Flaky, golden, baked for your morning.",
    price: 900,
    image: "",
    categoryId: "bakery",
    available: true,
    position: 1,
  },
];
export function WebsiteDemo() {
  const [header, setHeader] = useState<ComponentKey>("header-minimal");
  const [color, setColor] = useState("#315f49");
  const keys: ComponentKey[] = [header, "menu-list", "footer-basic"];
  const sections: Section[] = keys.map((key, i) => ({
    id: `demo-${i}`,
    key,
    version: i === 0 ? 3 : 2,
    visible: true,
    settings: {
      ...defaultSettings(key),
      image: "",
      title:
        i === 0
          ? business.name
          : i === 1
            ? "A good morning starts here."
            : business.name,
      description:
        i === 1 ? "Sample menu - not a real business or ordering page" : "",
      eyebrow: "SAMPLE WEBSITE",
      background: i === 0 ? color : "#fcfaf5",
      color: i === 0 ? "#ffffff" : "#243d30",
      links: [{ label: "Sample menu", url: "#menu" }],
      buttonUrl: "#menu",
    },
  }));
  return (
    <>
      <div className="public-demo-controls">
        <label>
          Header layout
          <select
            value={header}
            onChange={(e) => setHeader(e.target.value as ComponentKey)}
          >
            <option value="header-minimal">Minimal</option>
            <option value="header-centered">Stacked - premium preview</option>
            <option value="header-dark">Masthead - premium preview</option>
          </select>
        </label>
        <label>
          Header color
          <input
            aria-label="Header color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <span>Preview only - no draft or ownership is saved</span>
      </div>
      <div className="public-real-demo">
        <WebsiteRenderer
          sections={sections}
          business={business}
          products={products}
        />
      </div>
      <p className="p-muted">
        This uses the existing website renderer with sample content. Layout and
        color are independent. Premium designs require separate ownership in
        your workspace before saving or publishing. No public online checkout is
        provided.
      </p>
      <Link className="p-button p-primary" href="/signup">
        Build your own free website
      </Link>
    </>
  );
}
