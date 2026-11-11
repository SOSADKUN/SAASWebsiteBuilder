import { z } from "zod";
export const safeUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    if (/[\\\u0000-\u0020\u007f]/.test(v)) return false;
    if (
      v === "" ||
      /^\/(?!\/)/.test(v) ||
      /^#[\w-]*$/.test(v) ||
      /^mailto:[^\s]+$/.test(v)
    )
      return true;
    try {
      const url = new URL(v);
      return (
        url.protocol === "https:" &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use HTTPS, a relative path, or an anchor");
export const settingsSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  image: safeUrl,
  imageAlt: z.string().max(180).optional(),
  images: z
    .array(z.object({ url: safeUrl, alt: z.string().max(180) }))
    .max(12)
    .optional(),
  eyebrow: z.string().max(100).optional(),
  typography: z.enum(["editorial", "modern"]).optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  align: z.enum(["left", "center", "right"]),
  spacing: z.number().int().min(16).max(160),
  buttonText: z.string().max(80),
  buttonUrl: safeUrl,
  links: z.array(z.object({ label: z.string().max(60), url: safeUrl })).max(10),
});
export type Settings = z.infer<typeof settingsSchema>;
export const sectionSchema = z.object({
  id: z.uuid(),
  key: z.string().max(80),
  version: z.union([z.literal(1), z.literal(2)]),
  visible: z.boolean(),
  settings: settingsSchema,
});
export const layoutSchema = z
  .array(sectionSchema)
  .min(1)
  .max(40)
  .refine(
    (a) => new Set(a.map((s) => s.id)).size === a.length,
    "Duplicate section IDs",
  );
export type Section = z.infer<typeof sectionSchema>;
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  position: number;
};
export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  hours: string;
  phone: string;
};
export type SectionCategory =
  | "header"
  | "hero"
  | "about"
  | "menu"
  | "gallery"
  | "ordering"
  | "location"
  | "contact"
  | "footer";
const catalogEntries = [
  ["header-minimal", "Minimal", "header", false, 0],
  ["header-centered", "Centered", "header", true, 19],
  ["header-dark", "Premium dark", "header", true, 24],
  ["hero-classic", "Classic portrait", "hero", false, 0],
  ["hero-full-image", "Full-width image", "hero", false, 0],
  ["hero-split", "Split image / text", "hero", true, 29],
  ["hero-editorial", "Editorial minimal", "hero", true, 29],
  ["about-classic", "Classic text / image", "about", false, 0],
  ["about-story", "Storytelling", "about", false, 0],
  ["menu-grid", "Product grid", "menu", false, 0],
  ["menu-list", "Elegant menu list", "menu", true, 19],
  ["menu-featured", "Featured products", "menu", true, 24],
  ["gallery-grid", "Masonry gallery", "gallery", false, 0],
  ["gallery-editorial", "Editorial gallery", "gallery", true, 19],
  ["ordering-cta", "Ordering CTA", "ordering", false, 0],
  ["location-hours", "Location & hours", "location", false, 0],
  ["contact-social", "Contact & social", "contact", false, 0],
  ["footer-basic", "Minimal footer", "footer", false, 0],
  ["footer-modern", "Multi-column footer", "footer", true, 15],
] as const;
export type ComponentKey = (typeof catalogEntries)[number][0];
const designDescriptions: Record<ComponentKey, string> = {
  "header-minimal":
    "A quiet wordmark, considered spacing, and navigation that stays out of the way.",
  "header-centered":
    "A centered identity with the warmth of a neighborhood meeting place.",
  "header-dark":
    "Deep espresso tones, a generous wordmark, and an understated outlined link.",
  "hero-classic":
    "An arched photograph and oversized serif type. A warm, familiar welcome.",
  "hero-full-image":
    "An immersive, edge-to-edge photograph with a confident editorial introduction.",
  "hero-split":
    "A balanced composition of story and photography, finished with a circular signature.",
  "hero-editorial":
    "Expressive typography, generous negative space, and a photograph in the margin.",
  "about-classic":
    "An inviting interior beside your story, with room for the details that matter.",
  "about-story":
    "A magazine-inspired story with a warm typographic signature and an intimate photo.",
  "menu-grid":
    "A photographic collection that lets every drink and fresh bake have its moment.",
  "menu-list":
    "Fine dotted leaders, elegant serif names, and beautifully simple prices.",
  "menu-featured":
    "Alternating, image-led features for the few favorites worth slowing down for.",
  "gallery-grid":
    "An organic rhythm of portrait and square photographs with considered captions.",
  "gallery-editorial":
    "Offset photographs and numbered captions, like a collection of little memories.",
  "footer-basic":
    "A quiet sign-off with your identity, useful links, and the essentials.",
  "footer-modern":
    "A generous invitation with columns for your story, directions, links, and hours.",
  "ordering-cta":
    "An existing, simple invitation to get in touch through your configured business link.",
  "location-hours":
    "A clear and welcoming place for directions and opening hours.",
  "contact-social":
    "Keep your business links and contact details within easy reach.",
};
export type Definition = {
  key: ComponentKey;
  name: string;
  type: SectionCategory;
  version: 2;
  versions: readonly (1 | 2)[];
  schema: typeof settingsSchema;
  defaultSettings: () => Settings;
  preview: "render";
  premium: boolean;
  price: number;
  description: string;
};
export const definitions: Definition[] = catalogEntries.map(
  ([key, name, type, premium, price]) => ({
    key,
    name,
    type,
    premium,
    price,
    version: 2,
    versions: [
      "hero-full-image",
      "hero-editorial",
      "about-classic",
      "menu-featured",
      "gallery-editorial",
    ].includes(key)
      ? [2]
      : [1, 2],
    schema: settingsSchema,
    defaultSettings: () => defaultSettings(key),
    preview: "render",
    description: designDescriptions[key],
  }),
);
export function defaultSettings(key: string): Settings {
  const type = definitions.find((d) => d.key === key)?.type;
  return {
    title:
      type === "hero"
        ? "Good coffee. Great company."
        : type === "menu"
          ? "Made with a little love"
          : type === "about"
            ? "Your everyday, a little better."
            : type === "ordering"
              ? "Your favorite coffee, a message away."
              : type === "gallery"
                ? "The art of slowing down."
                : type === "location"
                  ? "Come find your corner."
                  : type === "contact"
                    ? "Let’s stay in touch."
                    : "Your café",
    description:
      type === "hero"
        ? "A neighborhood space for slow mornings, meaningful conversations, and really good coffee."
        : "Freshly brewed, thoughtfully made. A warm welcome is always waiting.",
    image:
      type === "header" || type === "footer"
        ? ""
        : type === "gallery" || type === "about"
          ? "/images/cafe/interior.jpg"
          : "/images/cafe/coffee.jpg",
    imageAlt:
      type === "gallery" || type === "about"
        ? "A warm, sunlit café interior"
        : "Freshly brewed coffee",
    images: [
      { url: "/images/cafe/latte.jpg", alt: "Latte art in a ceramic cup" },
      { url: "/images/cafe/pastry.jpg", alt: "Freshly baked croissants" },
      { url: "/images/cafe/coffee.jpg", alt: "The ritual of brewing coffee" },
    ],
    eyebrow:
      type === "hero"
        ? "GOOD COFFEE. SLOW MOMENTS."
        : type === "about"
          ? "ROOTED IN THE EVERYDAY"
          : type === "menu"
            ? "CRAFTED WITH CARE"
            : "A PLACE TO BELONG",
    typography: "editorial",
    background:
      key === "header-dark"
        ? "#203b30"
        : type === "hero"
          ? "#f1ece3"
          : key === "footer-modern"
            ? "#302a24"
            : "#fbf9f4",
    color:
      key === "header-dark" ||
      key === "footer-modern" ||
      key === "hero-full-image"
        ? "#fff9ed"
        : "#352b23",
    align: "left",
    spacing: 64,
    buttonText: "Explore our menu",
    buttonUrl: "#menu",
    links: [
      { label: "Our story", url: "#about" },
      { label: "Menu", url: "#menu" },
      { label: "Visit us", url: "#location" },
    ],
  };
}
export function switchVariant(section: Section, key: string): Section {
  const current = definitions.find((d) => d.key === section.key);
  const next = definitions.find((d) => d.key === key);
  if (!next || current?.type !== next.type)
    throw new Error("Choose a variant in the same category");
  const before = defaultSettings(section.key);
  const after = defaultSettings(key);
  const beforeBackground =
    section.version === 1
      ? section.key === "header-dark"
        ? "#203b30"
        : current?.type === "hero"
          ? "#eee8dc"
          : "#fffdf8"
      : before.background;
  const beforeColor =
    section.version === 1
      ? section.key === "header-dark"
        ? "#fffdf8"
        : "#263d32"
      : before.color;
  return {
    ...section,
    key,
    version: next.version,
    settings: {
      ...after,
      ...section.settings,
      background:
        section.settings.background === beforeBackground
          ? after.background
          : section.settings.background,
      color:
        section.settings.color === beforeColor
          ? after.color
          : section.settings.color,
    },
  };
}
export function initialLayout(businessName = "Bloom Café"): Section[] {
  return [
    "header-minimal",
    "hero-classic",
    "about-story",
    "menu-grid",
    "gallery-grid",
    "ordering-cta",
    "location-hours",
    "contact-social",
    "footer-basic",
  ].map((key) => ({
    id: crypto.randomUUID(),
    key,
    version: 2,
    visible: true,
    settings: {
      ...defaultSettings(key),
      ...(key.startsWith("header") || key.startsWith("footer")
        ? { title: businessName }
        : {}),
    },
  }));
}
export function applyDesign(
  sections: Section[],
  key: string,
  businessName: string,
): Section[] {
  const definition = definitions.find((d) => d.key === key);
  if (!definition) throw new Error("Unknown component");
  const matching = sections.find(
    (s) => definitions.find((d) => d.key === s.key)?.type === definition.type,
  );
  const defaults = defaultSettings(key);
  if (matching)
    return sections.map((s) =>
      s.id === matching.id
        ? {
            ...switchVariant(s, key),
          }
        : s,
    );
  return insertSection(sections, {
    id: crypto.randomUUID(),
    key,
    version: definition.version,
    visible: true,
    settings: {
      ...defaults,
      ...(definition.type === "header" || definition.type === "footer"
        ? { title: businessName }
        : {}),
    },
  });
}
export function insertSection(
  sections: Section[],
  section: Section,
): Section[] {
  const category = definitions.find((d) => d.key === section.key)?.type;
  const index =
    category === "header"
      ? 0
      : category === "footer"
        ? sections.length
        : sections.findIndex(
            (s) => definitions.find((d) => d.key === s.key)?.type === "footer",
          );
  const result = [...sections];
  result.splice(index < 0 ? result.length : index, 0, section);
  return result;
}
export function validateSelection(
  sections: Section[],
  unlocked: string[],
  published: string[],
  premiumKeys: string[] = definitions
    .filter((d) => d.premium)
    .map((d) => d.key),
) {
  layoutSchema.parse(sections);
  for (const section of sections) {
    const d = definitions.find((d) => d.key === section.key);
    if (!d || !d.versions.includes(section.version))
      throw new Error("Unsupported component version");
    if (!published.includes(d.key))
      throw new Error(`${d.name} is not available`);
    if (premiumKeys.includes(d.key) && !unlocked.includes(d.key))
      throw new Error(`Unlock ${d.name} first`);
  }
  return sections;
}
