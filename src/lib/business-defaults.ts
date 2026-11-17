import { initialLayout, type Section } from "./models";
import type { BusinessType } from "./business-modules";
// Starter content only. Existing/published layouts and renderers are untouched.
export function initialBusinessLayout(
  name: string,
  type: BusinessType,
): Section[] {
  const layout = initialLayout(name);
  if (type === "cafe") return layout;
  const salon = ["nail_salon", "hair_salon", "beauty_studio"].includes(type);
  return layout.map((section) => ({
    ...section,
    visible:
      salon && ["menu-grid", "ordering-cta"].includes(section.key)
        ? false
        : section.visible,
    settings: {
      ...section.settings,
      ...(section.key.startsWith("header")
        ? {
            links: [
              { label: "About", url: "#about" },
              { label: "Visit us", url: "#location" },
            ],
          }
        : {}),
      ...(section.key.startsWith("hero")
        ? {
            title: name,
            description:
              "Welcome to our business. Find out what we offer and how to visit us.",
            eyebrow: "WELCOME",
            buttonText: "Find us",
            buttonUrl: "#location",
          }
        : {}),
      ...(section.key.startsWith("about")
        ? {
            title: "About us",
            description: "Add your business story here.",
            eyebrow: "OUR BUSINESS",
          }
        : {}),
      ...(section.key.startsWith("menu")
        ? {
            title: type === "bakery" ? "Our bakery" : "Retail products",
            description: "Explore our products.",
          }
        : {}),
      ...(section.key === "ordering-cta"
        ? {
            title: "Contact us",
            description: "Get in touch for product information.",
            buttonText: "Find us",
            buttonUrl: "#location",
          }
        : {}),
    },
  }));
}
