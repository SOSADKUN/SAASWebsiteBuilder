"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PanelsTopLeft,
  Files,
  UtensilsCrossed,
  ShoppingBag,
  Boxes,
  Images,
  Settings,
  ArrowUpRight,
  ChevronDown,
  Plus,
  Search,
  Check,
  Lock,
  Menu,
  Sun,
  Moon,
  LogOut,
  ExternalLink,
  ArrowRight,
  X,
  Coffee,
  Globe,
  ChevronRight,
  Leaf,
} from "lucide-react";
import type { DashboardData as Data } from "./types";
import { MenuManager } from "./menu-manager";
import { ComponentGallery } from "@/components/designs/component-gallery";
import { Editor } from "@/components/editor/editor";
import { WebsiteRenderer } from "@/components/website/registry";
import {
  definitions,
  defaultSettings,
  applyDesign,
  type Section,
} from "@/lib/models";
import {
  unlock,
  upload,
  updateBusiness,
  signOut,
  createPage,
} from "@/server/actions";

const navigation = [
  ["Overview", LayoutDashboard],
  ["Website Editor", PanelsTopLeft],
  ["Design Gallery", PanelsTopLeft],
  ["Pages", Files],
  ["Menu Manager", UtensilsCrossed],
  ["Component Store", ShoppingBag],
  ["My Components", Boxes],
  ["Media Library", Images],
  ["Website Settings", Settings],
] as const;
export function Dashboard({
  data,
  initialTab = "Overview",
}: {
  data: Data;
  initialTab?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [sidebar, setSidebar] = useState(false);
  const [dark, setDark] = useState(false);
  const [pageId, setPageId] = useState(data.pages[0]?.id);
  const [workingLayouts, setWorkingLayouts] = useState<
    Record<string, Section[]>
  >(() => Object.fromEntries(data.pages.map((p) => [p.id, p.draft])));
  const [designHistory, setDesignHistory] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        data.pages.map((p) => [p.id, p.draft.map((s) => s.key)]),
      ),
  );
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All components");
  const [storePreview, setStorePreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const page = data.pages.find((p) => p.id === pageId) ?? data.pages[0];
  const workingSections = page ? (workingLayouts[page.id] ?? page.draft) : [];
  const hasUnsavedChanges = data.pages.some(
    (p) =>
      JSON.stringify(workingLayouts[p.id] ?? p.draft) !==
      JSON.stringify(p.draft),
  );
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsavedChanges]);
  const catalog = definitions.map((d) => {
    const row = data.catalog.find((c) => c.key === d.key);
    const price = data.prices.find((p) => p.componentKey === d.key)?.price;
    return {
      ...d,
      active: row?.active ?? false,
      premium: row?.premium ?? d.premium,
      category: row?.category ?? d.type,
      price: price === undefined ? d.price : price / 100,
    };
  });
  const unlocked = [
    ...data.unlocked,
    ...catalog.filter((d) => !d.premium).map((d) => d.key),
  ];
  const available: string[] = catalog.filter((d) => d.active).map((d) => d.key);
  function run(action: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await action();
        setNotice(message);
        router.refresh();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }
  function navigate(next: string) {
    setTab(next);
    setSidebar(false);
    setNotice("");
  }
  function applyToWorkingPage(key: string) {
    if (!page || !available.includes(key) || !unlocked.includes(key)) return;
    setWorkingLayouts((previous) => ({
      ...previous,
      [page.id]: applyDesign(
        previous[page.id] ?? page.draft,
        key,
        data.business.name,
      ),
    }));
    setDesignHistory((previous) => ({
      ...previous,
      [page.id]: [key, ...(previous[page.id] ?? []).filter((k) => k !== key)],
    }));
  }
  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a className="brand" href="/dashboard">
          <span className="brand-icon">b.</span>bloom
          <span className="brand-dot">®</span>
        </a>
        <div className="workspace-switch">
          <span className="business-avatar">
            <Coffee size={20} />
          </span>
          <div>
            <b>{data.business.name}</b>
            <small>YOUR WORKSPACE</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {navigation.map(([label, Icon]) => (
            <button
              key={label}
              className={tab === label ? "nav-item active" : "nav-item"}
              onClick={() => navigate(label)}
            >
              <Icon size={18} />
              {label}
              {label === "Component Store" && (
                <span className="new-badge">NEW</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <span>✦ MADE FOR YOUR NEXT CHAPTER</span>
            <h3>A little more possibility.</h3>
            <p>Find a fresh look for your growing business.</p>
            <button onClick={() => navigate("Component Store")}>
              Explore components <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="theme-toggle" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}{" "}
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <div className="profile">
            <span className="user-avatar">
              {data.email.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>Your account</b>
              <small>{data.email}</small>
            </div>
            <form action={signOut}>
              <button className="icon-button" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(!sidebar)}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{tab}</b>
          </div>
          <div className="topbar-actions">
            <span className="live-label">
              <span className="status-dot" />
              {page?.published ? "Website live" : "Draft website"}
            </span>
            <button className="button compact" onClick={() => setPreview(true)}>
              <EyeIcon />
              Preview website <ArrowUpRight size={13} />
            </button>
            <button
              className="button primary compact"
              onClick={() => navigate("Website Editor")}
            >
              {tab === "Website Editor" ? "Editing website" : "Open editor"}{" "}
              <ArrowUpRight size={14} />
            </button>
            <span className="user-avatar top-avatar">
              {data.email.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main
          className={
            tab === "Website Editor" ? "editor-main" : "dashboard-main"
          }
        >
          {notice && (
            <div className="notice toast" role="status">
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {tab === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</span>
                  <h1>
                    Let’s grow something good
                    <span className="heading-flower">✳</span>
                  </h1>
                  <p>
                    Welcome back. Here’s what’s happening with{" "}
                    {data.business.name}.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => navigate("Website Editor")}
                >
                  Continue editing <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="overview-grid">
                <div className="website-card">
                  <div className="card-title">
                    <div>
                      <span className="small-icon">
                        <Globe size={18} />
                      </span>
                      <h3>Your website</h3>
                    </div>
                    <span className="pill">
                      <span className="status-dot" />
                      {page?.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="website-snapshot">
                    <div className="snapshot-browser">
                      <i />
                      <i />
                      <i />
                      <span>/sites/{data.business.slug}</span>
                    </div>
                    <div className="snapshot-inner">
                      <WebsiteRenderer
                        sections={page?.draft.slice(0, 2) ?? []}
                        business={data.business}
                        products={data.products}
                      />
                    </div>
                  </div>
                  <div className="website-card-footer">
                    <div>
                      <b>{data.business.name}</b>
                      <small>/sites/{data.business.slug}</small>
                    </div>
                    <button
                      className="button compact"
                      onClick={() => navigate("Website Editor")}
                    >
                      Edit website <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="overview-right">
                  <div className="welcome-card">
                    <span className="eyebrow">
                      YOUR BUSINESS, BEAUTIFULLY ONLINE
                    </span>
                    <h2>
                      Big heart.
                      <br />
                      Beautiful website.
                    </h2>
                    <p>
                      You bring the passion. We’ll help you make it feel right
                      at home online.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => navigate("Website Editor")}
                    >
                      Make it yours <ArrowRight size={16} />
                    </button>
                    <span className="welcome-art">✳</span>
                  </div>
                  <div className="quick-stats">
                    <div>
                      <span>
                        <UtensilsCrossed size={17} /> On the menu
                      </span>
                      <strong>{data.products.length}</strong>
                      <small>
                        {data.products.filter((p) => p.available).length}{" "}
                        available products
                      </small>
                    </div>
                    <div>
                      <span>
                        <Boxes size={17} /> Your collection
                      </span>
                      <strong>
                        {
                          catalog.filter(
                            (d) => !d.premium || data.unlocked.includes(d.key),
                          ).length
                        }
                      </strong>
                      <small>Components ready to use</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="section-heading">
                <div>
                  <h2>Your next little step</h2>
                  <p>Everything you need to make your website feel like you.</p>
                </div>
                <span className="subtle">BUILT FOR YOUR BUSINESS</span>
              </div>
              <div className="steps-grid">
                {[
                  {
                    icon: PanelsTopLeft,
                    label: "Make a great first impression",
                    text: "Find your style. Tell your story. Make every section your own.",
                    action: "Customize your website",
                    target: "Website Editor",
                    color: "sage",
                  },
                  {
                    icon: UtensilsCrossed,
                    label: "Give them a taste",
                    text: "Add your signature drinks, fresh bakes, and everyday favorites.",
                    action: "Manage your menu",
                    target: "Menu Manager",
                    color: "peach",
                  },
                  {
                    icon: ShoppingBag,
                    label: "Find your next favorite",
                    text: "Explore thoughtfully crafted components for a fresh new look.",
                    action: "Browse the store",
                    target: "Component Store",
                    color: "lavender",
                  },
                ].map(({ icon: Icon, ...item }) => (
                  <article className="step-card" key={item.target}>
                    <span className={`step-icon ${item.color}`}>
                      <Icon size={22} />
                    </span>
                    <h3>{item.label}</h3>
                    <p>{item.text}</p>
                    <button
                      className="text-button"
                      onClick={() => navigate(item.target)}
                    >
                      {item.action}
                      <ArrowUpRight size={14} />
                    </button>
                  </article>
                ))}
              </div>
              <div className="bottom-note">
                <Leaf size={16} />
                <span>
                  Good things take a little care. Your next chapter starts here.
                </span>
                <span>Made with Bloom ✳</span>
              </div>
            </>
          )}
          {tab === "Website Editor" && page && (
            <Editor
              key={page.id}
              page={page}
              business={data.business}
              products={data.products}
              unlocked={unlocked}
              available={available}
              sections={workingSections}
              onSectionsChange={(next) =>
                setWorkingLayouts((previous) => ({
                  ...previous,
                  [page.id]:
                    typeof next === "function"
                      ? next(previous[page.id] ?? page.draft)
                      : next,
                }))
              }
              media={data.media}
              onSaved={() => router.refresh()}
            />
          )}
          {tab === "Design Gallery" && page && (
            <ComponentGallery
              business={data.business}
              products={data.products}
              sections={workingSections}
              pages={data.pages}
              pageId={page.id}
              onPageChange={setPageId}
              catalog={catalog}
              unlocked={unlocked}
              history={designHistory[page.id] ?? []}
              onApply={applyToWorkingPage}
              onUnlock={async (key) => {
                await unlock(data.business.id, key);
                router.refresh();
              }}
            />
          )}
          {tab === "Pages" && (
            <>
              <PageHeading
                eyebrow="YOUR WEBSITE’S STORY"
                title="A home for every idea."
                description="Manage the pages that make up your website."
              />
              <div className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.pages.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Files size={16} /> {p.title}
                          </td>
                          <td>
                            <code>
                              /sites/{data.business.slug}
                              {p.path === "/" ? "" : p.path}
                            </code>
                          </td>
                          <td>
                            <span className="pill">
                              {p.published ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="button compact"
                              onClick={() => {
                                setPageId(p.id);
                                navigate("Website Editor");
                              }}
                            >
                              Edit page <ArrowUpRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form
                  className="inline-form"
                  action={(form) =>
                    run(
                      () =>
                        createPage(
                          data.business.id,
                          String(form.get("title")),
                          String(form.get("path")),
                        ),
                      "Page created.",
                    )
                  }
                >
                  <input
                    name="title"
                    placeholder="Page title"
                    maxLength={80}
                    required
                  />
                  <input
                    name="path"
                    placeholder="/our-story"
                    pattern="/[a-z0-9-]+"
                    required
                  />
                  <button disabled={pending} className="button primary">
                    <Plus size={16} /> Add page
                  </button>
                </form>
              </div>
            </>
          )}
          {(tab === "Component Store" || tab === "My Components") && (
            <>
              <PageHeading
                eyebrow={
                  tab === "Component Store"
                    ? "A FRESH PERSPECTIVE"
                    : "YOUR DESIGN COLLECTION"
                }
                title={
                  tab === "Component Store"
                    ? "Little details. Big possibilities."
                    : "Made for your next idea."
                }
                description={
                  tab === "Component Store"
                    ? "Thoughtfully crafted sections to make your website feel like you."
                    : "Your free and demo-unlocked components, ready to make your own."
                }
              />
              {tab === "Component Store" && (
                <div className="demo-banner">
                  <span className="small-icon">✦</span>
                  <div>
                    <b>A little room to experiment</b>
                    <p>
                      This is a DEMO store. Unlock premium designs for free. No
                      payment is collected.
                    </p>
                  </div>
                  <span className="pill">DEMO MODE</span>
                </div>
              )}
              <div className="store-toolbar">
                <div className="store-tabs">
                  {[
                    "All components",
                    "header",
                    "hero",
                    "menu",
                    "gallery",
                    "footer",
                    "other",
                    "themes",
                  ].map((c) => (
                    <button
                      className={category === c ? "active" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c === "All components"
                        ? c
                        : c === "other"
                          ? "Other sections"
                          : c === "themes"
                            ? "Complete themes"
                            : c.charAt(0).toUpperCase() + c.slice(1) + "s"}
                    </button>
                  ))}
                </div>
                <label className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search components"
                    placeholder="Find your style…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="store-grid">
                {catalog
                  .filter(
                    (d) =>
                      d.active &&
                      (tab === "Component Store" ||
                        !d.premium ||
                        unlocked.includes(d.key)) &&
                      (category === "All components" ||
                        d.category === category ||
                        (category === "other" &&
                          ![
                            "header",
                            "hero",
                            "menu",
                            "gallery",
                            "footer",
                          ].includes(d.category))) &&
                      d.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((d, i) => (
                    <article className="store-card" key={d.key}>
                      <button
                        className={`component-thumbnail thumb-${i % 4}`}
                        onClick={() => setStorePreview(d.key)}
                        aria-label={`Preview ${d.name}`}
                      >
                        <div className={`mini-design mini-${d.type}`}>
                          <span className="mini-logo">bloom.</span>
                          {d.type === "header" ? (
                            <div className="mini-nav">
                              Our story　 Menu　 Visit us
                            </div>
                          ) : (
                            <>
                              <h3>
                                {d.type === "hero"
                                  ? "A slower kind of morning."
                                  : d.type === "menu"
                                    ? "A little of what you love."
                                    : d.name}
                              </h3>
                              <div className="mini-lines">
                                <i />
                                <i />
                              </div>
                              {["hero", "gallery", "menu"].includes(d.type) && (
                                <div className="mini-photo" />
                              )}
                              <span className="mini-button" />
                            </>
                          )}
                        </div>
                        <span className="thumbnail-badge">
                          {d.premium ? "PREMIUM" : "FREE"}
                        </span>
                      </button>
                      <div className="store-card-body">
                        <div>
                          <span className="eyebrow">
                            {d.category} · V{d.version}.0
                          </span>
                          <h3>{d.name}</h3>
                          <p>{d.description}</p>
                        </div>
                        <div className="store-card-footer">
                          <b>
                            {d.premium ? `$${d.price.toFixed(0)}` : "Free"}
                            {d.premium && <small>one-time · demo</small>}
                          </b>
                          <button
                            className="button compact"
                            disabled={pending}
                            onClick={() => {
                              if (!d.premium || unlocked.includes(d.key)) {
                                setPageId(page?.id);
                                applyToWorkingPage(d.key);
                                navigate("Website Editor");
                                setNotice(
                                  "Design applied to your draft. Save or publish when you’re ready.",
                                );
                              } else
                                run(
                                  () => unlock(data.business.id, d.key),
                                  "Demo component unlocked. You can now apply it in the editor.",
                                );
                            }}
                          >
                            {!d.premium || unlocked.includes(d.key) ? (
                              <>
                                <Check size={14} /> Use design
                              </>
                            ) : (
                              <>
                                <Lock size={13} /> Demo unlock
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {category === "themes" && (
                <div className="empty-state">
                  <Boxes size={30} />
                  <h3>Complete themes are coming next.</h3>
                  <p>For now, create your own look with individual sections.</p>
                </div>
              )}
            </>
          )}
          {tab === "Menu Manager" && (
            <MenuManager data={data} run={run} pending={pending} />
          )}
          {tab === "Media Library" && (
            <>
              <PageHeading
                eyebrow="YOUR BRAND, IN PICTURES"
                title="A picture of your world."
                description="Upload JPEG, PNG or WebP images up to 5 MB."
              />
              <div className="upload-zone">
                <Images size={30} />
                <h3>A little glimpse of your business</h3>
                <p>Upload photos to use in your sections and menu.</p>
                <label className="button primary upload-button">
                  {pending ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={pending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const form = new FormData();
                      form.set("file", file);
                      run(
                        () => upload(data.business.id, form),
                        "Image added to your library.",
                      );
                    }}
                  />
                </label>
              </div>
              <div className="media-grid">
                {data.media.map((m) => (
                  <article className="panel" key={m.id}>
                    <img src={m.url} alt={m.name} />
                    <b>{m.name}</b>
                    <button
                      className="button compact"
                      onClick={() =>
                        run(
                          () => navigator.clipboard.writeText(m.url),
                          "Image URL copied. Paste it into your section or product image field.",
                        )
                      }
                    >
                      Copy URL
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "Website Settings" && (
            <>
              <PageHeading
                eyebrow="THE LITTLE ESSENTIALS"
                title="All the details that matter."
                description="Keep your business information up to date across your website."
              />
              <form
                className="panel settings-form"
                action={(form) =>
                  run(
                    () => updateBusiness(data.business.id, form),
                    "Business information saved.",
                  )
                }
              >
                <h3>Business information</h3>
                <label>
                  Business name
                  <input
                    name="name"
                    defaultValue={data.business.name}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Website description
                  <textarea
                    name="description"
                    defaultValue={data.business.description}
                    maxLength={1000}
                  />
                </label>
                <label>
                  Address
                  <input
                    name="address"
                    defaultValue={data.business.address}
                    maxLength={300}
                  />
                </label>
                <label>
                  Opening hours
                  <textarea
                    name="hours"
                    defaultValue={data.business.hours}
                    maxLength={300}
                  />
                </label>
                <label>
                  WhatsApp business number
                  <input
                    name="phone"
                    defaultValue={data.business.phone}
                    placeholder="60123456789"
                    pattern="[0-9]{0,15}"
                  />
                  <small>
                    Include country code, digits only. Leave empty to disable
                    WhatsApp ordering.
                  </small>
                </label>
                <label>
                  Public website address
                  <input value={`/sites/${data.business.slug}`} readOnly />
                </label>
                <button className="button primary" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
      {(preview || storePreview) && (
        <div className="modal-overlay">
          <div
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Website preview"
          >
            <div className="modal-heading">
              <b>
                {storePreview ? "Component preview" : "Draft website preview"}
              </b>
              <div>
                {!storePreview && page?.published && (
                  <a
                    className="button compact"
                    href={`/sites/${data.business.slug}${page.path === "/" ? "" : page.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View published <ExternalLink size={13} />
                  </a>
                )}
                <button
                  className="icon-button"
                  aria-label="Close preview"
                  onClick={() => {
                    setPreview(false);
                    setStorePreview(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-scroll">
              <WebsiteRenderer
                sections={
                  storePreview
                    ? [
                        {
                          id: storePreview,
                          key: storePreview,
                          version: definitions.find(
                            (d) => d.key === storePreview,
                          )!.version,
                          visible: true,
                          settings: defaultSettings(storePreview),
                        },
                      ]
                    : workingSections
                }
                business={data.business}
                products={data.products}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function EyeIcon() {
  return <Globe size={14} />;
}
function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
