"use client";
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Check,
  Lock,
  Search,
  X,
  Columns2,
  History,
} from "lucide-react";
import {
  definitions,
  defaultSettings,
  switchVariant,
  type Business,
  type Product,
  type Section,
  type SectionCategory,
} from "@/lib/models";
import {
  DesignPreview,
  DeviceToggle,
  type PreviewDevice,
} from "./design-preview";
type CatalogItem = { key: string; active: boolean; premium: boolean };
type Props = {
  business: Business;
  products: Product[];
  sections: Section[];
  pages: { id: string; title: string }[];
  pageId: string;
  onPageChange: (id: string) => void;
  catalog: CatalogItem[];
  unlocked: string[];
  history: string[];
  onApply: (key: string) => void;
  onUnlock: (key: string) => Promise<void>;
};
const categories: ("all" | SectionCategory)[] = [
  "all",
  "header",
  "hero",
  "about",
  "menu",
  "gallery",
  "footer",
];
export function ComponentGallery({
  business,
  products,
  sections,
  pages,
  pageId,
  onPageChange,
  catalog,
  unlocked,
  history,
  onApply,
  onUnlock,
}: Props) {
  const [category, setCategory] = useState<string>("hero");
  const [search, setSearch] = useState("");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [wholePage, setWholePage] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!comparing) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComparing(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [comparing]);
  const designs = definitions.filter(
    (d) =>
      catalog.some((c) => c.key === d.key && c.active) &&
      (category === "all" || d.type === category) &&
      d.name.toLowerCase().includes(search.toLowerCase()),
  );
  function previewSections(key: string): Section[] {
    const definition = definitions.find((d) => d.key === key)!;
    const existing = sections.find(
      (s) => definitions.find((d) => d.key === s.key)?.type === definition.type,
    );
    const defaults = defaultSettings(key);
    return [
      {
        id: `preview-${key}`,
        key,
        version: definition.version,
        visible: true,
        settings: {
          ...defaults,
          ...(existing ? switchVariant(existing, key).settings : {}),
          ...(!existing &&
          (definition.type === "header" || definition.type === "footer")
            ? { title: business.name }
            : {}),
        },
      },
    ];
  }
  async function choose(key: string) {
    const item = catalog.find((c) => c.key === key);
    if (!item?.active) return;
    if (item.premium && !unlocked.includes(key)) {
      setBusy(key);
      try {
        await onUnlock(key);
        setMessage("Demo design unlocked. Select Apply design to use it.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not unlock design");
      } finally {
        setBusy(undefined);
      }
      return;
    }
    onApply(key);
    setWholePage(true);
    setMessage(
      "Design applied to your working page. Save draft or publish in the editor.",
    );
  }
  return (
    <div className="design-gallery">
      <div className="gallery-page-heading">
        <div>
          <span className="eyebrow">THE SECTION LIBRARY</span>
          <h1>
            A new look.
            <br />
            <em>The same little place.</em>
          </h1>
          <p>
            Considered layouts for coffee, conversation, and everything in
            between.
            <br />
            Explore a design. Make it yours. Keep your story.
          </p>
        </div>
        <div className="gallery-heading-art" aria-hidden="true">
          ✳
          <span>
            THOUGHTFULLY
            <br />
            PUT TOGETHER
          </span>
        </div>
      </div>
      <div className="gallery-workspace-bar">
        <label>
          Designing for
          <select value={pageId} onChange={(e) => onPageChange(e.target.value)}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <span>Changes stay in your draft until you publish.</span>
        <button
          className="button compact"
          onClick={() => setWholePage(!wholePage)}
        >
          {wholePage ? "Hide page preview" : "Preview current page"}
          <ArrowUpRight size={14} />
        </button>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <div className="gallery-controls">
        <div className="gallery-categories" aria-label="Component category">
          {categories.map((c) => (
            <button
              aria-pressed={category === c}
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => {
                setCategory(c);
                setCompare([]);
              }}
            >
              {c === "all"
                ? "All sections"
                : c === "hero"
                  ? "Heroes"
                  : c === "gallery"
                    ? "Galleries"
                    : c === "about"
                      ? "About"
                      : c.charAt(0).toUpperCase() + c.slice(1) + "s"}
              <small>
                {
                  definitions.filter(
                    (d) =>
                      (c === "all" || d.type === c) &&
                      catalog.some((item) => item.key === d.key && item.active),
                  ).length
                }
              </small>
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search section designs"
            placeholder="Find a design…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="gallery-preview-toolbar">
        <span>{designs.length} designs, endless possibilities.</span>
        <DeviceToggle value={device} onChange={setDevice} />
        <button
          className="button compact"
          disabled={compare.length !== 2}
          onClick={() => setComparing(true)}
        >
          <Columns2 size={14} /> Compare {compare.length}/2
        </button>
      </div>
      {wholePage && (
        <section className="current-page-preview">
          <div>
            <h2>Your current page</h2>
            <small>Unsaved working layout</small>
          </div>
          <DesignPreview
            sections={sections}
            business={business}
            products={products}
            device={device}
          />
        </section>
      )}
      <div className="gallery-designs">
        {designs.map((d) => {
          const selected = sections.some((s) => s.key === d.key);
          const locked =
            catalog.find((c) => c.key === d.key)?.premium &&
            !unlocked.includes(d.key);
          return (
            <article
              className={`gallery-design ${selected ? "is-applied" : ""}`}
              key={d.key}
            >
              <div className="gallery-design-topline">
                <span>
                  {d.type.toUpperCase()} <i /> {d.name}
                </span>
                <label className="compare-check">
                  <input
                    type="checkbox"
                    checked={compare.includes(d.key)}
                    disabled={!compare.includes(d.key) && compare.length === 2}
                    onChange={() =>
                      setCompare(
                        compare.includes(d.key)
                          ? compare.filter((k) => k !== d.key)
                          : [...compare, d.key],
                      )
                    }
                  />{" "}
                  Compare
                </label>
              </div>
              <DesignPreview
                sections={previewSections(d.key)}
                business={business}
                products={products}
                device={device}
                maxHeight={520}
              />
              <div className="gallery-design-info">
                <div>
                  <span className="eyebrow">
                    {d.premium ? "PREMIUM DESIGN" : "FREE DESIGN"} · VERSION{" "}
                    {d.version}.0
                  </span>
                  <h2>{d.name}</h2>
                  <p>{d.description}</p>
                </div>
                <div className="gallery-design-actions">
                  {selected && (
                    <span className="applied-label">
                      <Check size={13} /> On your page
                    </span>
                  )}
                  <button
                    className={
                      selected ? "button compact" : "button primary compact"
                    }
                    disabled={busy === d.key}
                    onClick={() => choose(d.key)}
                  >
                    {busy === d.key ? (
                      "Unlocking…"
                    ) : locked ? (
                      <>
                        <Lock size={13} /> Demo unlock
                      </>
                    ) : (
                      <>
                        {selected ? "Apply again" : "Apply design"}
                        <ArrowUpRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!designs.length && (
        <div className="empty-state">
          <Search size={25} />
          <h3>No matching designs</h3>
          <p>Try another category or search term.</p>
        </div>
      )}
      <section className="design-history">
        <div>
          <History size={17} />
          <h3>Previously selected</h3>
          <span>Your content stays with you when you change designs.</span>
        </div>
        <div className="history-chips">
          {[...new Set(history)].map((key) => {
            const d = definitions.find((d) => d.key === key);
            if (!d) return null;
            const item = catalog.find((c) => c.key === key);
            return (
              <button
                key={key}
                disabled={!item?.active || busy === key}
                onClick={() => choose(key)}
              >
                {d.name}
                {sections.some((s) => s.key === key) ? (
                  <Check size={12} />
                ) : (
                  <ArrowUpRight size={12} />
                )}
              </button>
            );
          })}
        </div>
      </section>
      {comparing && (
        <div className="modal-overlay">
          <div
            className="comparison-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Compare section designs"
          >
            <header>
              <div>
                <span className="eyebrow">SIDE BY SIDE</span>
                <h2>A different point of view.</h2>
              </div>
              <DeviceToggle value={device} onChange={setDevice} />
              <button
                className="icon-button"
                aria-label="Close comparison"
                onClick={() => setComparing(false)}
              >
                <X size={22} />
              </button>
            </header>
            <div className="comparison-columns">
              {compare.map((key) => (
                <div key={key}>
                  <h3>{definitions.find((d) => d.key === key)?.name}</h3>
                  <DesignPreview
                    sections={previewSections(key)}
                    business={business}
                    products={products}
                    device={device}
                    maxHeight={600}
                  />
                  <button
                    className="button primary"
                    disabled={busy === key}
                    onClick={() => choose(key)}
                  >
                    Select this design <ArrowUpRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
