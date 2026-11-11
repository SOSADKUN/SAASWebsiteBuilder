"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Monitor,
  ClipboardList,
  SlidersHorizontal,
  PanelsTopLeft,
  ShoppingBag,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  X,
  Coffee,
} from "lucide-react";
import {
  navigationGroups,
  primaryNavigation,
  isNavigationVisible,
  type NavigationItem,
  type DashboardView,
} from "@/lib/dashboard-navigation";
import type { MerchantCapability } from "@/lib/merchant-capabilities";
import { signOut } from "@/server/actions";
type Outlet = { id: string; name: string };
type Props = {
  businessName: string;
  logoUrl?: string;
  email: string;
  view: string;
  open: boolean;
  dark: boolean;
  capabilities: readonly MerchantCapability[];
  onNavigate: (view: DashboardView) => void;
  onClose: () => void;
  onThemeToggle: () => void;
  outlets?: Outlet[];
  currentOutletId?: string;
  onOutletChange?: (id: string) => void;
};
const icons = {
  maintenance: SlidersHorizontal,
  website: PanelsTopLeft,
  store: ShoppingBag,
  settings: Settings,
};
export function MerchantSidebar({
  businessName,
  logoUrl,
  email,
  view,
  open,
  dark,
  capabilities,
  onNavigate,
  onClose,
  onThemeToggle,
  outlets,
  currentOutletId,
  onOutletChange,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    website: true,
  });
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [
          ...document.querySelectorAll<HTMLElement>(
            "#merchant-sidebar a[href], #merchant-sidebar button:not([disabled]), #merchant-sidebar select, #merchant-sidebar summary",
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", escape);
    const desktop = window.matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", escape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open, onClose]);
  function activate(
    event: MouseEvent<HTMLAnchorElement>,
    item: NavigationItem,
  ) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (item.view) onNavigate(item.view);
  }
  function itemLink(item: NavigationItem, nested = false) {
    if (!isNavigationVisible(item, capabilities)) return null;
    return item.comingSoon ? (
      <div
        key={item.id}
        className={`platform-nav-item unavailable ${nested ? "nested" : ""}`}
        aria-disabled="true"
      >
        <span>{item.label}</span>
        <small>Coming soon</small>
      </div>
    ) : (
      <Link
        key={item.id}
        href={item.href!}
        prefetch={false}
        aria-current={view === item.view ? "page" : undefined}
        className={`platform-nav-item ${nested ? "nested" : ""} ${view === item.view ? "active" : ""}`}
        onClick={(event) => activate(event, item)}
      >
        {!nested && <LayoutDashboard size={17} />}
        <span>{item.label}</span>
        {item.id === "designs" && (
          <small className="design-nav-badge">DESIGN</small>
        )}
      </Link>
    );
  }
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        id="merchant-sidebar"
        className={`sidebar platform-sidebar ${open ? "open" : ""}`}
        aria-label="Merchant workspace"
      >
        <div className="merchant-identity">
          <div className="merchant-logo">
            {logoUrl ? <img src={logoUrl} alt="" /> : <Coffee size={23} />}
          </div>
          <div>
            <small>MERCHANT WORKSPACE</small>
            <b title={businessName}>{businessName}</b>
          </div>
          <button
            ref={closeButton}
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {outlets?.length && onOutletChange ? (
          <label className="outlet-selector">
            Current outlet
            <select
              value={currentOutletId}
              onChange={(event) => onOutletChange(event.target.value)}
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="platform-nav-scroll">
          <span className="nav-label">YOUR BUSINESS</span>
          <nav aria-label="Main navigation">
            <div className="primary-platform-nav">
              {primaryNavigation.map((item) =>
                item.comingSoon ? (
                  <div
                    key={item.id}
                    className="platform-nav-item unavailable"
                    aria-disabled="true"
                  >
                    {item.id === "pos" ? (
                      <Monitor size={17} />
                    ) : (
                      <ClipboardList size={17} />
                    )}
                    <span>{item.label}</span>
                    <small>Coming soon</small>
                  </div>
                ) : (
                  itemLink(item)
                ),
              )}
            </div>
            {navigationGroups.map((group) => {
              const visible = group.children.filter((item) =>
                isNavigationVisible(item, capabilities),
              );
              if (!visible.length) return null;
              const Icon = icons[group.icon];
              const active = group.children.some((item) => item.view === view);
              return (
                <details
                  key={group.id}
                  className={`platform-nav-group ${active ? "contains-active" : ""}`}
                  open={expanded[group.id] ?? active}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setExpanded((previous) =>
                      previous[group.id] === isOpen
                        ? previous
                        : { ...previous, [group.id]: isOpen },
                    );
                  }}
                >
                  <summary>
                    <Icon size={17} />
                    <span>{group.label}</span>
                    <ChevronDown className="group-chevron" size={14} />
                  </summary>
                  <div className="platform-nav-children">
                    {visible.map((item) => itemLink(item, true))}
                  </div>
                </details>
              );
            })}
          </nav>
          {capabilities.includes("website:manage") && (
            <div className="sidebar-builder-note">
              <span>YOUR WEBSITE, YOUR WAY</span>
              <p>A considered space for your business.</p>
              <Link
                href="/dashboard/designs"
                prefetch={false}
                onClick={(event) =>
                  activate(event, {
                    id: "designs",
                    label: "Design Gallery",
                    view: "Design Gallery",
                  })
                }
              >
                Explore the design library ↗
              </Link>
            </div>
          )}
        </div>
        <footer className="platform-sidebar-footer">
          <button className="theme-toggle" onClick={onThemeToggle}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}{" "}
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <div className="profile">
            <span className="user-avatar">
              {email.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>Your account</b>
              <small title={email}>{email}</small>
            </div>
            <form action={signOut}>
              <button className="icon-button" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
          <span className="platform-credit">
            Powered by <b>bloom</b> <span>F&B WORKSPACE</span>
          </span>
        </footer>
      </aside>
    </>
  );
}
