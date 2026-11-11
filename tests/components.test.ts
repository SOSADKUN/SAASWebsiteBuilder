import { describe, it, expect } from "vitest";
import {
  defaultSettings,
  applyDesign,
  definitions,
  initialLayout,
  layoutSchema,
  safeUrl,
  settingsSchema,
  validateSelection,
} from "../src/lib/models";
describe("trusted component configuration", () => {
  it("applies a matching variant while preserving merchant text and IDs", () => {
    const sections = initialLayout("Acorn Café");
    sections[1].settings.title = "Our own story";
    const result = applyDesign(sections, "hero-split", "Acorn Café");
    expect(result).toHaveLength(sections.length);
    expect(result[1]).toMatchObject({
      id: sections[1].id,
      key: "hero-split",
      settings: { title: "Our own story" },
    });
    expect(sections[1].key).toBe("hero-classic");
    expect(sections[0].settings.title).toBe("Acorn Café");
  });
  it("uses current admin pricing policy when checking entitlements", () => {
    const sections = initialLayout();
    sections[1].key = "hero-split";
    expect(() =>
      validateSelection(
        sections,
        [],
        definitions.map((d) => d.key),
        [],
      ),
    ).not.toThrow();
    sections[1].key = "hero-classic";
    expect(() =>
      validateSelection(
        sections,
        [],
        definitions.map((d) => d.key),
        ["hero-classic"],
      ),
    ).toThrow("Unlock");
  });
  it("provides valid versioned defaults for all registered designs", () => {
    for (const d of definitions)
      expect(settingsSchema.safeParse(defaultSettings(d.key)).success).toBe(
        true,
      );
    expect(new Set(definitions.map((d) => d.key)).size).toBe(
      definitions.length,
    );
  });
  it("starts with all nine section types and unique section IDs", () => {
    const layout = initialLayout();
    expect(layoutSchema.parse(layout)).toHaveLength(9);
    expect(
      new Set(layout.map((s) => definitions.find((d) => d.key === s.key)!.type))
        .size,
    ).toBe(9);
  });
  it("rejects locked premium sections, including hidden ones", () => {
    const sections = initialLayout();
    sections[1].key = "hero-split";
    sections[1].visible = false;
    expect(() =>
      validateSelection(
        sections,
        [],
        definitions.map((d) => d.key),
      ),
    ).toThrow("Unlock");
  });
  it("accepts entitled designs and preserves their order", () => {
    const sections = initialLayout();
    sections[1].key = "hero-split";
    expect(
      validateSelection(
        sections,
        ["hero-split"],
        definitions.map((d) => d.key),
      ),
    ).toEqual(sections);
  });
  it("rejects unknown, unpublished, duplicate and future-version components", () => {
    const sections = initialLayout();
    expect(() => validateSelection(sections, [], [])).toThrow("not available");
    expect(() =>
      validateSelection(
        [{ ...sections[0], key: "uploaded-script" }],
        [],
        ["uploaded-script"],
      ),
    ).toThrow("Unsupported");
    expect(() => layoutSchema.parse([sections[0], sections[0]])).toThrow(
      "Duplicate",
    );
    expect(() =>
      layoutSchema.parse([{ ...sections[0], version: 3 }]),
    ).toThrow();
  });
  it("blocks executable and protocol-relative URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "//attacker.test",
      "http://example.com",
      "/\\attacker.test",
      "https://",
      "https://user:password@example.com",
    ]) {
      expect(safeUrl.safeParse(url).success).toBe(false);
    }
    for (const url of [
      "https://example.com/photo.jpg",
      "/sites/cafe",
      "#menu",
      "mailto:hello@example.com",
    ])
      expect(safeUrl.safeParse(url).success).toBe(true);
  });
  it("limits user-controlled layout size and styles", () => {
    expect(layoutSchema.safeParse([]).success).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...defaultSettings("hero-classic"),
        background: "url(javascript:bad)",
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...defaultSettings("hero-classic"),
        spacing: 9999,
      }).success,
    ).toBe(false);
  });
});
