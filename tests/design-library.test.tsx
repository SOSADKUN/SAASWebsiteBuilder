import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import {
  definitions,
  defaultSettings,
  initialLayout,
  switchVariant,
  applyDesign,
  layoutSchema,
} from "../src/lib/models";
import {
  resolveComponent,
  WebsiteRenderer,
  sectionLibrary,
} from "../src/components/website/registry";
const business = {
  id: "test",
  name: "Merchant Café",
  slug: "merchant-cafe",
  description: "",
  address: "",
  hours: "",
  phone: "",
};
describe("versioned design library", () => {
  it("registers every supported version and all required design categories", () => {
    for (const definition of definitions) {
      expect(
        definition.schema.safeParse(definition.defaultSettings()).success,
      ).toBe(true);
      for (const version of definition.versions)
        expect(resolveComponent(definition.key, version)).toBeTypeOf(
          "function",
        );
      expect(sectionLibrary.find((d) => d.key === definition.key)?.render).toBe(
        resolveComponent(definition.key, definition.version),
      );
    }
    for (const [category, count] of Object.entries({
      header: 3,
      hero: 3,
      about: 2,
      menu: 3,
      gallery: 2,
      footer: 2,
    }))
      expect(
        definitions.filter((d) => d.type === category).length,
      ).toBeGreaterThanOrEqual(count);
  });
  it("preserves merchant content and custom appearance across every variant pair", () => {
    for (const from of definitions)
      for (const to of definitions.filter((d) => d.type === from.type)) {
        const section = {
          id: crypto.randomUUID(),
          key: from.key,
          version: from.version,
          visible: false,
          settings: {
            ...defaultSettings(from.key),
            title: "My own heading",
            description: "My own story",
            background: "#112233",
            color: "#abcdef",
            image: "/uploads/my-photo.jpg",
            spacing: 96,
            links: [{ label: "Custom link", url: "/our-story" }],
          },
        };
        const result = switchVariant(section, to.key);
        expect(result.settings).toEqual(section.settings);
        expect(result.id).toBe(section.id);
        expect(result.visible).toBe(false);
        expect(result.version).toBe(to.version);
        expect(section.key).toBe(from.key);
      }
  });
  it("retains legacy implementations until an explicit design selection", () => {
    const sections = initialLayout(business.name);
    sections[2] = {
      ...sections[2],
      version: 1,
      settings: {
        ...sections[2].settings,
        background: "#fffdf8",
        color: "#263d32",
      },
    };
    const published = structuredClone(sections);
    const oldHtml = renderToStaticMarkup(
      <WebsiteRenderer
        sections={[sections[2]]}
        business={business}
        products={[]}
      />,
    );
    const changed = applyDesign(sections, "about-story", business.name);
    const newHtml = renderToStaticMarkup(
      <WebsiteRenderer
        sections={[changed[2]]}
        business={business}
        products={[]}
      />,
    );
    expect(oldHtml).toContain("cafe-about");
    expect(oldHtml).not.toContain("story-columns");
    expect(newHtml).toContain("story-columns");
    expect(changed[2].version).toBe(2);
    expect(sections).toEqual(published);
    expect(resolveComponent("hero-editorial", 1)).toBeUndefined();
  });
  it("keeps original settings valid without new optional fields", () => {
    const section = initialLayout()[0];
    const { eyebrow, images, imageAlt, typography, ...originalSettings } =
      section.settings;
    void eyebrow;
    void images;
    void imageAlt;
    void typography;
    expect(
      layoutSchema.safeParse([
        { ...section, version: 1, settings: originalSettings },
      ]).success,
    ).toBe(true);
  });
  it("inserts missing sections in a useful page position", () => {
    const sections = initialLayout();
    const withoutHeader = sections.filter((s) => !s.key.startsWith("header"));
    expect(
      applyDesign(withoutHeader, "header-centered", business.name)[0].key,
    ).toBe("header-centered");
    const withoutGallery = sections.filter((s) => !s.key.startsWith("gallery"));
    const changed = applyDesign(
      withoutGallery,
      "gallery-editorial",
      business.name,
    );
    expect(changed.at(-2)?.key).toBe("gallery-editorial");
    expect(changed.at(-1)?.key).toBe("footer-basic");
  });
  it("uses locally bundled default photos and valid image files", async () => {
    const paths = new Set<string>();
    for (const definition of definitions) {
      const settings = defaultSettings(definition.key);
      if (settings.image) paths.add(settings.image);
      for (const image of settings.images ?? []) paths.add(image.url);
    }
    for (const path of paths) {
      expect(path.startsWith("/images/cafe/")).toBe(true);
      const bytes = await readFile(`public${path}`);
      expect([...bytes.slice(0, 3)]).toEqual([255, 216, 255]);
    }
    for (const file of [
      "latte",
      "pastry",
      "coffee",
      "interior",
      "iced-latte",
      "toast",
      "matcha",
      "brownie",
    ])
      expect(
        (await readFile(`public/images/cafe/${file}.jpg`)).length,
      ).toBeGreaterThan(10000);
  });
  it("gives redesigned variants distinct markup", () => {
    for (const category of [
      "header",
      "hero",
      "about",
      "menu",
      "gallery",
      "footer",
    ]) {
      const html = definitions
        .filter((d) => d.type === category)
        .map((d) =>
          renderToStaticMarkup(
            <WebsiteRenderer
              sections={[
                {
                  id: crypto.randomUUID(),
                  key: d.key,
                  version: d.version,
                  visible: true,
                  settings: defaultSettings(d.key),
                },
              ]}
              business={business}
              products={[]}
            />,
          ),
        );
      expect(new Set(html).size).toBe(html.length);
    }
  });
  it("separates header layouts from palette and preserves published version-two renderers", () => {
    const header = initialLayout()[0];
    for (const key of ["header-minimal", "header-centered", "header-dark"]) {
      const next = switchVariant(header, key);
      expect(next.version).toBe(3);
      expect(next.settings.background).toBe(header.settings.background);
      expect(next.settings.color).toBe(header.settings.color);
      expect(defaultSettings(key).background).toBe(
        defaultSettings("header-minimal").background,
      );
    }
    expect(resolveComponent("header-centered", 2)).not.toBe(
      resolveComponent("header-centered", 3),
    );
    expect(resolveComponent("header-dark", 2)).not.toBe(
      resolveComponent("header-dark", 3),
    );
  });
});
