"use client";
import { useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import {
  definitions,
  defaultSettings,
  type Business,
  type Product,
  type SectionCategory,
  type Section,
} from "@/lib/models";
import { formatDesignPrice } from "@/lib/design-pricing";
import { DesignUnlockDialog } from "@/components/editor/design-unlock-dialog";
import type { DesignOffer } from "@/components/editor/design-picker";
import {
  DesignPreview,
  DeviceToggle,
  type PreviewDevice,
} from "./design-preview";

const labels: Record<SectionCategory, string> = {
  header: "Header",
  hero: "Hero",
  about: "About",
  menu: "Menu",
  gallery: "Gallery",
  ordering: "Ordering",
  location: "Location",
  contact: "Contact",
  footer: "Footer",
};
export const designStoreCategories = [
  ...new Set(definitions.map((d) => d.type)),
];
type StoreOffer = DesignOffer & { active: boolean };

export function WebsiteDesignStore({
  business,
  products,
  offers,
  unlocked,
  canUnlock,
  onOpenEditor,
  onRefresh,
}: {
  business: Business;
  products: Product[];
  offers: StoreOffer[];
  unlocked: string[];
  canUnlock: boolean;
  onOpenEditor: () => void;
  onRefresh: () => void;
}) {
  const [category, setCategory] = useState<SectionCategory>("header");
  const [selection, setSelection] = useState("header-minimal");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [checkout, setCheckout] = useState<DesignOffer | null>(null);
  const [newlyOwned, setNewlyOwned] = useState<string[]>([]);
  const categories = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const designs = definitions.filter(
    (d) =>
      d.type === category && offers.some((o) => o.key === d.key && o.active),
  );
  const selected = designs.find((d) => d.key === selection) ?? designs[0];
  const offer = offers.find((o) => o.key === selected?.key);
  const owned =
    !!offer &&
    (!offer.premium ||
      unlocked.includes(offer.key) ||
      newlyOwned.includes(offer.key));
  const sections: Section[] = selected
    ? [
        {
          id: "00000000-0000-4000-8000-000000000001",
          key: selected.key,
          version: selected.version,
          visible: true,
          settings: {
            ...defaultSettings(selected.key),
            ...(selected.type === "header" || selected.type === "footer"
              ? { title: business.name }
              : {}),
          },
        },
      ]
    : [];
  return (
    <section className="website-design-store" aria-label="Website design store">
      <header className="design-store-heading">
        <div>
          <h1>Website Designs</h1>
          <p>
            Choose a section. Find your layout. Make it yours in the editor.
          </p>
        </div>
        <span className="design-store-demo">Demo store · no payments</span>
      </header>
      <nav className="design-store-categories" aria-label="Section categories">
        <button
          className="icon-button"
          aria-label="Scroll categories left"
          onClick={() =>
            categories.current?.scrollBy({ left: -240, behavior: "smooth" })
          }
        >
          <ChevronLeft size={18} />
        </button>
        <div ref={categories}>
          {designStoreCategories.map((type) => (
            <button
              key={type}
              className={category === type ? "selected" : ""}
              aria-pressed={category === type}
              onClick={() => {
                setCategory(type);
                list.current?.scrollTo({ top: 0 });
              }}
            >
              {labels[type]}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Scroll categories right"
          onClick={() =>
            categories.current?.scrollBy({ left: 240, behavior: "smooth" })
          }
        >
          <ChevronRight size={18} />
        </button>
      </nav>
      <div className="design-store-layout">
        <div className="design-store-display panel">
          <div className="design-store-toolbar">
            <span>Live section preview</span>
            <DeviceToggle value={device} onChange={setDevice} />
          </div>
          {selected ? (
            <>
              <div className="design-store-stage">
                <DesignPreview
                  sections={sections}
                  business={business}
                  products={products}
                  device={device}
                  maxHeight={480}
                />
              </div>
              <div className="design-store-details" aria-live="polite">
                <div>
                  <span className="design-store-kind">
                    {labels[category]} layout
                  </span>
                  <h2>{selected.name}</h2>
                  <p>{selected.description}</p>
                  <small>
                    Colors, text and images can be changed in the editor.
                  </small>
                </div>
                <div className="design-store-purchase">
                  <strong>
                    {owned
                      ? offer?.premium
                        ? "Owned"
                        : "Included"
                      : formatDesignPrice(offer?.price ?? 0)}
                  </strong>
                  {owned ? (
                    <button className="button primary" onClick={onOpenEditor}>
                      Open editor <ArrowUpRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      disabled={!canUnlock || !offer}
                      onClick={() => offer && setCheckout(offer)}
                    >
                      <Lock size={16} /> Unlock for demo
                    </button>
                  )}
                  {!owned && (
                    <small>
                      {canUnlock
                        ? "Listed price only. Demo unlock is free."
                        : "Ask an authorized team member to unlock this design."}
                    </small>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="design-store-empty">
              No designs are currently available in this category.
            </div>
          )}
        </div>
        <aside
          className="design-store-rail panel"
          aria-label={`${labels[category]} designs`}
        >
          <div className="design-store-rail-heading">
            <h2>{labels[category]} designs</h2>
            <span>{designs.length}</span>
          </div>
          <div className="design-store-options" ref={list}>
            {designs.map((design, index) => {
              const item = offers.find((o) => o.key === design.key)!;
              const available =
                !item.premium ||
                unlocked.includes(item.key) ||
                newlyOwned.includes(item.key);
              return (
                <button
                  key={design.key}
                  className={selected?.key === design.key ? "selected" : ""}
                  aria-pressed={selected?.key === design.key}
                  onClick={() => setSelection(design.key)}
                >
                  <span className="design-store-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <b>{design.name}</b>
                    <small>
                      {available
                        ? item.premium
                          ? "Owned"
                          : "Included"
                        : formatDesignPrice(item.price)}
                    </small>
                  </span>
                  {available ? <Check size={16} /> : <Lock size={16} />}
                  <ChevronRight size={15} />
                </button>
              );
            })}
            {!designs.length && <p>No available layouts.</p>}
          </div>
          <small className="design-store-hint">
            Select a design to preview it. Nothing is changed on your website.
          </small>
        </aside>
      </div>
      {checkout && (
        <DesignUnlockDialog
          merchantId={business.id}
          offer={checkout}
          onClose={() => setCheckout(null)}
          onUnlocked={(key) => {
            setNewlyOwned((previous) => [...previous, key]);
            setCheckout(null);
            onRefresh();
          }}
        />
      )}
    </section>
  );
}
