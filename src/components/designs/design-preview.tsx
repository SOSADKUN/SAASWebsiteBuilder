"use client";
import { useEffect, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import type { Business, Product, Section } from "@/lib/models";
import { WebsiteRenderer } from "@/components/website/registry";
export type PreviewDevice = "desktop" | "tablet" | "mobile";
const widths = { desktop: 1280, tablet: 768, mobile: 390 };
export function DeviceToggle({
  value,
  onChange,
}: {
  value: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}) {
  return (
    <div className="device-switch" aria-label="Preview device">
      {(
        [
          { key: "desktop", icon: Monitor },
          { key: "tablet", icon: Tablet },
          { key: "mobile", icon: Smartphone },
        ] as const
      ).map(({ key, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-label={`${key} preview`}
          aria-pressed={value === key}
          className={value === key ? "active" : ""}
          onClick={() => onChange(key)}
        >
          <Icon size={16} />
          <span>{key}</span>
        </button>
      ))}
    </div>
  );
}
export function DesignPreview({
  sections,
  business,
  products,
  device,
  maxHeight = 580,
}: {
  sections: Section[];
  business: Business;
  products: Product[];
  device: PreviewDevice;
  maxHeight?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 650 });
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (outer.current && content.current)
        setSize({
          width: outer.current.clientWidth,
          height: content.current.scrollHeight,
        });
    });
    if (outer.current) observer.observe(outer.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  const width = widths[device];
  const scale = Math.min(size.width / width, 1);
  const height = Math.max(110, size.height * scale);
  return (
    <div
      className={`design-viewport viewport-${device}`}
      ref={outer}
      data-device={device}
      style={{ maxHeight }}
    >
      <div
        className="design-scaled-space"
        style={{ width: Math.min(width, size.width), height, margin: "0 auto" }}
      >
        <div
          ref={content}
          className="design-scaled-content"
          style={{ width, transform: `scale(${scale})` }}
          onClickCapture={(e) => {
            if ((e.target as Element).closest("a")) e.preventDefault();
          }}
        >
          <WebsiteRenderer
            sections={sections}
            business={business}
            products={products}
          />
        </div>
      </div>
    </div>
  );
}
