"use client";
import { useEffect, useRef } from "react";
import { Lock, Check, ChevronDown } from "lucide-react";
import { definitions } from "@/lib/models";
import { formatDesignPrice } from "@/lib/design-pricing";
export type DesignOffer = { key: string; price: number; premium: boolean };
export function DesignPicker({
  value,
  available,
  unlocked,
  offers,
  onChoose,
  onUnlock,
}: {
  value: string;
  available: string[];
  unlocked: string[];
  offers: DesignOffer[];
  onChoose: (key: string) => void;
  onUnlock: (key: string) => void;
}) {
  const dropdown = useRef<HTMLDetailsElement>(null);
  const options = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      if (
        event.type === "resize" ||
        !dropdown.current?.contains(event.target as Node)
      )
        dropdown.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", close);
    };
  }, []);
  const selected = definitions.find((d) => d.key === value);
  return (
    <details
      className="editor-design-picker"
      ref={dropdown}
      onToggle={() => {
        const panel = options.current;
        if (!panel || typeof panel.showPopover !== "function") return;
        if (!dropdown.current?.open) {
          panel.hidePopover();
          return;
        }
        const rect = dropdown.current
          .querySelector("summary")!
          .getBoundingClientRect();
        const width = Math.min(300, window.innerWidth - 24);
        Object.assign(panel.style, {
          position: "fixed",
          width: `${width}px`,
          maxWidth: "none",
          left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
          right: "auto",
          top: `${rect.bottom + 4}px`,
          bottom: "auto",
          margin: "0",
        });
        panel.showPopover();
        panel.style.top = `${Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - panel.getBoundingClientRect().height - 12))}px`;
      }}
    >
      <summary aria-label={`Choose ${selected?.type ?? "section"} layout`}>
        {!unlocked.includes(value) && <Lock size={13} />}
        <span>{selected?.name ?? value}</span>
        <ChevronDown size={13} />
      </summary>
      <div
        className="editor-design-options"
        ref={options}
        popover="manual"
        role="group"
        aria-label={`${selected?.type ?? "Section"} layouts`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            dropdown.current?.removeAttribute("open");
            dropdown.current?.querySelector("summary")?.focus();
          }
        }}
      >
        {definitions
          .filter((d) => d.type === selected?.type)
          .map((d) => {
            const active = available.includes(d.key),
              owned = unlocked.includes(d.key),
              offer = offers.find((o) => o.key === d.key);
            return (
              <div
                key={d.key}
                className={
                  d.key === value
                    ? "editor-design-option selected"
                    : "editor-design-option"
                }
              >
                <button
                  type="button"
                  disabled={!active}
                  onClick={() => {
                    onChoose(d.key);
                    dropdown.current?.removeAttribute("open");
                  }}
                  aria-pressed={d.key === value}
                >
                  <b>{d.name}</b>
                  <small>
                    {!active
                      ? "Unavailable"
                      : owned
                        ? "Available"
                        : "Preview only"}
                  </small>
                </button>
                {active && !owned ? (
                  <button
                    type="button"
                    className="design-unlock"
                    onClick={() => {
                      onUnlock(d.key);
                      dropdown.current?.removeAttribute("open");
                    }}
                    aria-label={`Unlock ${d.name}`}
                  >
                    <Lock size={14} />
                    <span>
                      {offer ? formatDesignPrice(offer.price) : "Unlock"}
                    </span>
                  </button>
                ) : owned ? (
                  <Check size={15} aria-label="Available" />
                ) : null}
              </div>
            );
          })}
      </div>
    </details>
  );
}
