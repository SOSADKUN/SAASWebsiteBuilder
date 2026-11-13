"use client";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { MediaPicker } from "./media-picker";
import { DesignPicker, type DesignOffer } from "./design-picker";
import { DesignUnlockDialog } from "./design-unlock-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ArrowUpRight,
  RotateCcw,
  Lock,
} from "lucide-react";
import {
  defaultSettings,
  switchVariant,
  insertSection,
  definitions,
  type Section,
  type Business,
  type Product,
} from "@/lib/models";
import { WebsiteRenderer } from "@/components/website/registry";
import { upload, restoreDraft } from "@/server/actions";
import { saveEditorLayout } from "@/server/design-actions";
type Page = { id: string; title: string; draft: Section[]; revision: number };
function SectionRow({
  section,
  selected,
  onSelect,
  onToggle,
  onRemove,
  onVariant,
  available,
  unlocked,
  offers,
  onUnlock,
}: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onVariant: (key: string) => void;
  available: string[];
  unlocked: string[];
  offers: DesignOffer[];
  onUnlock: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`section-row ${selected ? "selected" : ""} ${!section.visible ? "muted" : ""}`}
      onClick={onSelect}
    >
      <button
        aria-label="Drag to reorder section"
        className="drag-handle"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <DesignPicker
        value={section.key}
        available={available}
        unlocked={unlocked}
        offers={offers}
        onChoose={onVariant}
        onUnlock={onUnlock}
      />

      <button className="section-name" onClick={onSelect}>
        {definitions.find((d) => d.key === section.key)?.name ?? section.key}
        <small>{definitions.find((d) => d.key === section.key)?.type}</small>
      </button>
      <button
        aria-label={section.visible ? "Hide section" : "Show section"}
        className="icon-button"
        onClick={onToggle}
      >
        {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        className="icon-button remove"
        aria-label="Remove section"
        onClick={onRemove}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
export function Editor({
  page,
  business,
  products,
  unlocked: serverUnlocked,
  available,
  offers,
  onSaved,
  sections,
  onSectionsChange: setSections,
  media,
}: {
  page: Page;
  business: Business;
  products: Product[];
  unlocked: string[];
  available: string[];
  offers: DesignOffer[];
  onSaved: () => void;
  sections: Section[];
  onSectionsChange: Dispatch<SetStateAction<Section[]>>;
  media: { id: string; url: string; name: string }[];
}) {
  const [verifiedUnlocks, setVerifiedUnlocks] = useState<string[]>([]);
  const unlocked = [...serverUnlocked, ...verifiedUnlocks];
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const blocked = [
    ...new Set(
      sections
        .filter((s) => !unlocked.includes(s.key) || !available.includes(s.key))
        .map((s) => s.key),
    ),
  ];
  const [saved, setSaved] = useState(page.draft);
  const [revision, setRevision] = useState(page.revision);
  const [selected, setSelected] = useState(
    sections.find((s) => s.key.startsWith("hero"))?.id ?? page.draft[0]?.id,
  );
  const [device, setDevice] = useState("desktop");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const current = sections.find((s) => s.id === selected);
  const dirty = JSON.stringify(sections) !== JSON.stringify(saved);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function change(patch: Partial<Section["settings"]>) {
    setSections((current) =>
      current.map((s) =>
        s.id === selected ? { ...s, settings: { ...s.settings, ...patch } } : s,
      ),
    );
  }
  function dragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id)
      setSections(
        arrayMove(
          sections,
          sections.findIndex((s) => s.id === e.active.id),
          sections.findIndex((s) => s.id === e.over!.id),
        ),
      );
  }
  async function persist(publish: boolean) {
    if (blocked.length) {
      setMessage("Unlock or remove preview-only designs before saving.");
      return;
    }
    if (publish && dirty) {
      setMessage("Save your draft before publishing.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await saveEditorLayout(
        business.id,
        page.id,
        sections,
        revision,
        publish,
      );
      if (!result.ok) {
        setMessage(`${result.error} Reference: ${result.reference}`);
        return;
      }
      setRevision(result.revision);
      setSaved(structuredClone(sections));
      setMessage(publish ? "Your website is live." : "Draft saved.");
      onSaved();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="editor">
      <div className="editor-toolbar">
        <div>
          <span className="page-chip">
            {page.title} <ChevronDown size={13} />
          </span>
          <span className="save-status">
            <span className={dirty ? "status-dot amber" : "status-dot"} />
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>
        <div className="device-switch">
          {[
            ["desktop", Monitor],
            ["tablet", Tablet],
            ["mobile", Smartphone],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Monitor;
            return (
              <button
                key={String(name)}
                className={device === name ? "active" : ""}
                aria-label={`${String(name)} preview`}
                onClick={() => setDevice(String(name))}
              >
                <I size={17} />
              </button>
            );
          })}
        </div>
        <div>
          <button
            className="button compact"
            disabled={busy || blocked.length > 0}
            onClick={() => persist(false)}
          >
            Save draft
          </button>
          <button
            className="button primary compact"
            disabled={busy || blocked.length > 0 || dirty}
            title={dirty ? "Save your draft before publishing" : undefined}
            onClick={() => persist(true)}
          >
            {busy ? "Saving…" : "Publish"} <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      {message && (
        <div role="status" className="editor-message">
          {message}
        </div>
      )}
      {blocked.length > 0 && (
        <div className="editor-preview-warning" role="status">
          <Lock size={16} />
          <span>
            Preview only: unlock the selected designs or remove them before
            saving or publishing.
          </span>
          {blocked
            .filter((key) => available.includes(key))
            .map((key) => (
              <button
                className="button compact"
                key={key}
                onClick={() => setUnlocking(key)}
              >
                Unlock {definitions.find((d) => d.key === key)?.name}
              </button>
            ))}
        </div>
      )}
      {unlocking && offers.find((o) => o.key === unlocking) && (
        <DesignUnlockDialog
          merchantId={business.id}
          offer={offers.find((o) => o.key === unlocking)!}
          onClose={() => setUnlocking(null)}
          onUnlocked={(key) => {
            setVerifiedUnlocks((previous) => [...previous, key]);
            setUnlocking(null);
            setMessage(
              "Design unlocked for demo. No payment was collected. You can now save your draft.",
            );
            onSaved();
          }}
        />
      )}
      <div className="editor-workspace">
        <aside className="sections-panel">
          <div className="panel-heading">
            <h3>Page sections</h3>
            <span>{sections.length}</span>
          </div>
          <p className="panel-hint">
            A little structure. Endless possibilities.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={dragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  selected={section.id === selected}
                  available={available}
                  unlocked={unlocked}
                  offers={offers}
                  onUnlock={setUnlocking}
                  onVariant={(key) =>
                    setSections((current) =>
                      current.map((s) =>
                        s.id === section.id ? switchVariant(s, key) : s,
                      ),
                    )
                  }
                  onSelect={() => setSelected(section.id)}
                  onToggle={() =>
                    setSections(
                      sections.map((s) =>
                        s.id === section.id ? { ...s, visible: !s.visible } : s,
                      ),
                    )
                  }
                  onRemove={() => {
                    if (sections.length > 1)
                      setSections(sections.filter((s) => s.id !== section.id));
                    else setMessage("Keep at least one section on the page.");
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button className="add-section" onClick={() => setAdding(!adding)}>
            <Plus size={16} /> Add a section
          </button>
          {adding && (
            <div className="section-picker">
              {definitions
                .filter((d) => available.includes(d.key))
                .map((d) => (
                  <button
                    key={d.key}
                    onClick={() => {
                      const section: Section = {
                        id: crypto.randomUUID(),
                        key: d.key,
                        version: d.version,
                        visible: true,
                        settings: defaultSettings(d.key),
                      };
                      setSections(insertSection(sections, section));
                      setSelected(section.id);
                      setAdding(false);
                    }}
                  >
                    {d.name}
                    {!unlocked.includes(d.key) ? (
                      <Lock size={13} />
                    ) : (
                      <Plus size={13} />
                    )}
                  </button>
                ))}
            </div>
          )}
          <div className="editor-tip">
            <span>✦</span>
            <b>Make it yours</b>
            <p>Drag sections to tell your story in your own way.</p>
          </div>
          <button
            className="text-button restore"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await restoreDraft(business.id, page.id);
                setSections(result.sections);
                setSaved(structuredClone(result.sections));
                setRevision(result.revision);
                setSelected(result.sections[0]?.id);
                setMessage("Restored your last saved draft.");
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Could not restore draft.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <RotateCcw size={13} /> Restore saved draft
          </button>
        </aside>
        <div className="preview-area">
          <div className={`preview-frame ${device}`}>
            <div className="browser-bar">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>⌁ /sites/{business.slug}</span>
              <ArrowUpRight size={12} />
            </div>
            <WebsiteRenderer
              sections={sections}
              business={business}
              products={products}
              onSelect={setSelected}
              selected={selected}
            />
          </div>
          <div className="preview-caption">
            <span className="status-dot" /> Live preview ·{" "}
            {device.charAt(0).toUpperCase() + device.slice(1)}{" "}
            <span>Changes are only visible to you until published</span>
          </div>
        </div>
        <aside className="properties-panel">
          <div className="panel-heading">
            <h3>Section settings</h3>
            <span>⚙</span>
          </div>
          {current ? (
            <>
              <div className="property-title">
                <span className="small-icon">✦</span>
                <div>
                  <b>{definitions.find((d) => d.key === current.key)?.name}</b>
                  <small>Make this section your own</small>
                </div>
              </div>
              <label>
                Design variant
                <DesignPicker
                  value={current.key}
                  available={available}
                  unlocked={unlocked}
                  offers={offers}
                  onUnlock={setUnlocking}
                  onChoose={(key) =>
                    setSections(
                      sections.map((s) =>
                        s.id === selected ? switchVariant(s, key) : s,
                      ),
                    )
                  }
                />
              </label>
              {current.version !==
                definitions.find((d) => d.key === current.key)?.version && (
                <button
                  className="button compact version-update"
                  onClick={() =>
                    setSections(
                      sections.map((s) =>
                        s.id === current.id ? switchVariant(s, s.key) : s,
                      ),
                    )
                  }
                >
                  Use updated layout
                </button>
              )}
              <h4 className="property-divider">CONTENT</h4>
              <label>
                Eyebrow text
                <input
                  value={current.settings.eyebrow ?? ""}
                  maxLength={100}
                  onChange={(e) => change({ eyebrow: e.target.value })}
                />
              </label>
              <label>
                Heading
                <input
                  value={current.settings.title}
                  onChange={(e) => change({ title: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={current.settings.description}
                  onChange={(e) => change({ description: e.target.value })}
                />
              </label>
              <label>
                Image URL
                <input
                  value={current.settings.image}
                  onChange={(e) => change({ image: e.target.value })}
                />
              </label>
              {current.settings.image && (
                <img
                  className="property-image"
                  src={current.settings.image}
                  alt="Section image"
                />
              )}
              <label className="upload-label">
                Upload image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const sectionId = current.id;
                    setBusy(true);
                    try {
                      const form = new FormData();
                      form.set("file", file);
                      const image = await upload(business.id, form);
                      setSections((latest) =>
                        latest.map((s) =>
                          s.id === sectionId
                            ? { ...s, settings: { ...s.settings, image } }
                            : s,
                        ),
                      );
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Upload failed",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              <label>
                Image description
                <input
                  value={current.settings.imageAlt ?? ""}
                  maxLength={180}
                  onChange={(e) => change({ imageAlt: e.target.value })}
                />
              </label>
              <MediaPicker
                media={media}
                value={current.settings.image}
                onSelect={(image) => change({ image })}
                onAdd={
                  current.key.startsWith("gallery")
                    ? (url, alt) => {
                        const images = current.settings.images ?? [];
                        if (
                          images.length < 12 &&
                          !images.some((i) => i.url === url)
                        )
                          change({ images: [...images, { url, alt }] });
                      }
                    : undefined
                }
              />
              {current.key.startsWith("gallery") && (
                <div className="gallery-image-settings">
                  <h4>Gallery collection</h4>
                  <small>
                    Your main image appears first, followed by these photos.
                  </small>
                  {(current.settings.images ?? []).map((image, i) => (
                    <div className="gallery-image-row" key={i}>
                      <img src={image.url} alt={image.alt} />
                      <input
                        aria-label={`Gallery image ${i + 1} description`}
                        value={image.alt}
                        maxLength={180}
                        onChange={(e) =>
                          change({
                            images: current.settings.images?.map((item, j) =>
                              i === j ? { ...item, alt: e.target.value } : item,
                            ),
                          })
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label={`Remove gallery image ${i + 1}`}
                        onClick={() =>
                          change({
                            images: current.settings.images?.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label>
                Button label
                <input
                  value={current.settings.buttonText}
                  onChange={(e) => change({ buttonText: e.target.value })}
                />
              </label>
              <label>
                Button link
                <input
                  value={current.settings.buttonUrl}
                  onChange={(e) => change({ buttonUrl: e.target.value })}
                />
              </label>
              <h4 className="property-divider">APPEARANCE</h4>
              <label>
                Typography
                <select
                  value={current.settings.typography ?? "editorial"}
                  onChange={(e) =>
                    change({
                      typography: e.target.value as "editorial" | "modern",
                    })
                  }
                >
                  <option value="editorial">Editorial serif</option>
                  <option value="modern">Modern sans</option>
                </select>
              </label>
              <div className="color-fields">
                <label>
                  Background
                  <input
                    type="color"
                    value={current.settings.background}
                    onChange={(e) => change({ background: e.target.value })}
                  />
                </label>
                <label>
                  Text color
                  <input
                    type="color"
                    value={current.settings.color}
                    onChange={(e) => change({ color: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Alignment
                <select
                  value={current.settings.align}
                  onChange={(e) =>
                    change({
                      align: e.target.value as Section["settings"]["align"],
                    })
                  }
                >
                  <option>left</option>
                  <option>center</option>
                  <option>right</option>
                </select>
              </label>
              <label>
                Section spacing · {current.settings.spacing}px
                <input
                  type="range"
                  min={16}
                  max={160}
                  value={current.settings.spacing}
                  onChange={(e) => change({ spacing: Number(e.target.value) })}
                />
              </label>
              <h4 className="property-divider">NAVIGATION LINKS</h4>
              {current.settings.links.map((link, i) => (
                <div key={i} className="link-edit">
                  <input
                    aria-label={`Link ${i + 1} label`}
                    value={link.label}
                    onChange={(e) =>
                      change({
                        links: current.settings.links.map((l, j) =>
                          i === j ? { ...l, label: e.target.value } : l,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`Link ${i + 1} URL`}
                    value={link.url}
                    onChange={(e) =>
                      change({
                        links: current.settings.links.map((l, j) =>
                          i === j ? { ...l, url: e.target.value } : l,
                        ),
                      })
                    }
                  />
                  <button
                    className="icon-button"
                    aria-label="Remove link"
                    onClick={() =>
                      change({
                        links: current.settings.links.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                className="text-button"
                disabled={current.settings.links.length >= 10}
                onClick={() =>
                  change({
                    links: [
                      ...current.settings.links,
                      { label: "New link", url: "#" },
                    ],
                  })
                }
              >
                <Plus size={13} /> Add link
              </button>
            </>
          ) : (
            <p className="panel-hint">Select a section to edit its settings.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
