import type { ComponentType, CSSProperties } from "react";
import {
  definitions,
  defaultSettings,
  type Business,
  type Product,
  type Section,
  type ComponentKey,
} from "@/lib/models";
import type { WebsiteSectionProps } from "./types";
import {
  HeaderMinimal,
  HeaderCentered,
  HeaderPremiumDark,
  HeaderStacked,
  HeaderMasthead,
} from "./sections/headers";
import {
  HeroClassic,
  HeroFullImage,
  HeroSplit,
  HeroEditorial,
} from "./sections/heroes";
import { AboutClassic, AboutStory } from "./sections/about";
import {
  MenuProductGrid,
  MenuElegantList,
  MenuFeatured,
} from "./sections/menus";
import { GalleryMasonry, GalleryEditorial } from "./sections/galleries";
import { FooterMinimal, FooterColumns } from "./sections/footers";
import { Ordering, Location, Contact } from "./sections/essentials";
import { legacyRegistry } from "./legacy";
export const componentRegistry: Record<
  ComponentKey,
  Record<2, ComponentType<WebsiteSectionProps>> &
    Partial<Record<1 | 3, ComponentType<WebsiteSectionProps>>>
> = {
  "header-minimal": {
    1: legacyRegistry["header-minimal"],
    2: HeaderMinimal,
    3: HeaderMinimal,
  },
  "header-centered": {
    1: legacyRegistry["header-centered"],
    2: HeaderCentered,
    3: HeaderStacked,
  },
  "header-dark": {
    1: legacyRegistry["header-dark"],
    2: HeaderPremiumDark,
    3: HeaderMasthead,
  },
  "hero-classic": { 1: legacyRegistry["hero-classic"], 2: HeroClassic },
  "hero-full-image": { 2: HeroFullImage },
  "hero-split": { 1: legacyRegistry["hero-split"], 2: HeroSplit },
  "hero-editorial": { 2: HeroEditorial },
  "about-classic": { 2: AboutClassic },
  "about-story": { 1: legacyRegistry["about-story"], 2: AboutStory },
  "menu-grid": { 1: legacyRegistry["menu-grid"], 2: MenuProductGrid },
  "menu-list": { 1: legacyRegistry["menu-list"], 2: MenuElegantList },
  "menu-featured": { 2: MenuFeatured },
  "gallery-grid": { 1: legacyRegistry["gallery-grid"], 2: GalleryMasonry },
  "gallery-editorial": { 2: GalleryEditorial },
  "footer-basic": { 1: legacyRegistry["footer-basic"], 2: FooterMinimal },
  "footer-modern": { 1: legacyRegistry["footer-modern"], 2: FooterColumns },
  "ordering-cta": { 1: Ordering, 2: Ordering },
  "location-hours": { 1: Location, 2: Location },
  "contact-social": { 1: Contact, 2: Contact },
};
export const sectionLibrary = definitions.map((definition) => ({
  ...definition,
  render: componentRegistry[definition.key][definition.version],
}));
export function resolveComponent(
  key: string,
  version: number,
): ComponentType<WebsiteSectionProps> | undefined {
  return (
    componentRegistry as Record<
      string,
      Record<number, ComponentType<WebsiteSectionProps>>
    >
  )[key]?.[version];
}
export function WebsiteRenderer({
  sections,
  business,
  products,
  onSelect,
  selected,
}: {
  sections: Section[];
  business: Business;
  products: Product[];
  onSelect?: (id: string) => void;
  selected?: string;
}) {
  return (
    <div className="cafe-site">
      {sections
        .filter((s) => s.visible)
        .map((section) => {
          const Component = resolveComponent(section.key, section.version);
          const settings = {
            ...defaultSettings(section.key),
            ...section.settings,
          };
          const category = definitions.find((d) => d.key === section.key)?.type;
          const style = {
            background: settings.background,
            color: settings.color,
            textAlign: settings.align,
            "--section-space": `${settings.spacing}px`,
            "--section-background": settings.background,
            "--section-color": settings.color,
          } as CSSProperties;
          return (
            <section
              key={section.id}
              id={
                category === "about"
                  ? "about"
                  : category === "menu"
                    ? "menu"
                    : category === "location"
                      ? "location"
                      : undefined
              }
              data-category={category}
              data-variant={section.key}
              data-typography={settings.typography ?? "editorial"}
              data-version={section.version}
              className={`cafe-section ${section.version === 1 ? "legacy-section" : ""} ${selected === section.id ? "preview-selected" : ""}`}
              style={style}
              onClick={
                onSelect
                  ? (e) => {
                      e.preventDefault();
                      onSelect(section.id);
                    }
                  : undefined
              }
            >
              {Component ? (
                <Component
                  settings={settings}
                  business={business}
                  products={products}
                />
              ) : (
                <div role="status">This section is currently unavailable.</div>
              )}
            </section>
          );
        })}
    </div>
  );
}
