"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Product } from "@/lib/models";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import { saveMenuProduct, uploadMenuProductImage } from "@/server/actions";

type Feedback = { error: string; reference?: string };
export function ProductEditor({
  product,
  categories,
  merchantId,
  onClose,
  onSaved,
}: {
  product: Partial<Product>;
  categories: { id: string; name: string }[];
  merchantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const [draft, setDraft] = useState(product);
  const [error, setError] = useState<Feedback | null>(null);
  const [imageError, setImageError] = useState<Feedback | null>(null);
  const [preview, setPreview] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [savedImage, setSavedImage] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || uploadPending;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    nameInput.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function uploadImage(file: File) {
    if (uploading.current || pending) return;
    setImageError(null);
    if (
      !file.size ||
      file.size > MAX_UPLOAD_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setImageError({
        error: `Choose a JPG, PNG or WebP image up to ${MAX_UPLOAD_LABEL}.`,
      });
      return;
    }
    uploading.current = true;
    setUploadPending(true);
    setSavedImage(false);
    setImageFailed(false);
    setPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.set("file", file);
    try {
      const result = await uploadMenuProductImage(merchantId, form);
      if (!result.ok) {
        setImageError(result);
        setPreview("");
        return;
      }
      setDraft((current) => ({ ...current, image: result.url }));
      setSavedImage(true);
    } catch {
      setImageError({
        error:
          "The image could not be uploaded. Check your connection and try again.",
      });
      setPreview("");
    } finally {
      uploading.current = false;
      setUploadPending(false);
    }
  }
  const imageUrl =
    preview ||
    (draft.image &&
    (/^https:\/\//.test(draft.image) || /^\/(?!\/)/.test(draft.image))
      ? draft.image
      : "");
  return (
    <dialog
      ref={dialog}
      className="product-editor"
      aria-labelledby="product-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="product-editor__header">
        <div>
          <span className="product-editor__eyebrow">
            YOUR MENU, MADE BETTER
          </span>
          <h2 id="product-editor-title">
            {product.id ? "Edit product" : "Add a new favorite"}
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close product form"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <form
        className="product-editor__form"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || uploading.current) return;
          const form = new FormData(event.currentTarget);
          const input = {
            id: product.id,
            name: String(form.get("name")),
            description: String(form.get("description")),
            price: Math.round(Number(form.get("price")) * 100),
            categoryId: String(form.get("categoryId")),
            image: draft.image ?? "",
            available: form.get("available") === "on",
            position: Number(form.get("position")),
          };
          setError(null);
          startTransition(async () => {
            try {
              const result = await saveMenuProduct(merchantId, input);
              if (!result.ok) {
                setError(result);
                return;
              }
              // Server revalidation already returns the updated menu. A second
              // router.refresh would reload all workspace data again.
              onSaved();
            } catch {
              setError({
                error:
                  "We could not confirm the save. Check your menu before trying again.",
              });
            }
          });
        }}
      >
        {error && (
          <p className="product-editor__error" role="alert">
            {error.error}
            {error.reference && (
              <small>Support reference: {error.reference}</small>
            )}
          </p>
        )}
        <div className="product-editor__body">
          <fieldset className="product-editor__details" disabled={pending}>
            <label>
              Product name
              <input
                ref={nameInput}
                name="name"
                defaultValue={product.name}
                placeholder="e.g. Iced oat latte"
                maxLength={120}
                required
              />
            </label>
            <label>
              Description{" "}
              <span className="product-editor__optional">Optional</span>
              <textarea
                name="description"
                defaultValue={product.description}
                placeholder="Tell customers what makes it special"
                rows={2}
                maxLength={1000}
              />
            </label>
            <div className="product-editor__pair">
              <label>
                Price (RM)
                <input
                  name="price"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  defaultValue={((product.price ?? 0) / 100).toFixed(2)}
                  required
                />
              </label>
              <label>
                Category
                <select
                  name="categoryId"
                  defaultValue={product.categoryId ?? categories[0]?.id}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="product-editor__pair product-editor__availability-row">
              <label>
                Display order
                <input
                  name="position"
                  type="number"
                  min="0"
                  max="10000"
                  defaultValue={product.position ?? 0}
                  required
                />
              </label>
              <label className="product-editor__availability">
                <input
                  type="checkbox"
                  name="available"
                  defaultChecked={product.available ?? true}
                />
                <span>
                  Available on website
                  <small>Ready for customers to order</small>
                </span>
              </label>
            </div>
          </fieldset>
          <aside className="product-photo" aria-label="Product image">
            <span className="product-photo__heading">
              Product photo <span>Optional</span>
            </span>
            <div className="product-photo__preview">
              {imageUrl && !imageFailed ? (
                <img
                  src={imageUrl}
                  alt="Product preview"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="product-photo__empty">
                  <ImagePlus size={30} strokeWidth={1.4} />
                  <span>
                    {imageFailed
                      ? "Image unavailable"
                      : "Make it look delicious"}
                  </span>
                </div>
              )}
              {uploadPending && (
                <span className="product-photo__loading">
                  <LoaderCircle size={22} className="product-editor__spinner" />
                  Uploading…
                </span>
              )}
            </div>
            <div className="product-photo__actions">
              <input
                ref={fileInput}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose a product image"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadImage(file);
                }}
              />
              <button
                type="button"
                className="button product-photo__upload"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={15} />
                {uploadPending
                  ? "Uploading…"
                  : draft.image
                    ? "Change photo"
                    : "Upload photo"}
              </button>
              {draft.image && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remove product image"
                  disabled={busy}
                  onClick={() => {
                    setDraft((current) => ({ ...current, image: "" }));
                    setPreview("");
                    setImageFailed(false);
                    setSavedImage(false);
                    setImageError(null);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <small className="product-photo__status" role="status">
              {savedImage ? (
                <>
                  <Check size={13} /> Image uploaded
                </>
              ) : (
                `JPG, PNG or WebP · Up to ${MAX_UPLOAD_LABEL}`
              )}
            </small>
            <label className="product-photo__url">
              Or paste an image URL
              <input
                name="image"
                value={draft.image ?? ""}
                placeholder="https://…"
                disabled={busy}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    image: event.target.value,
                  }));
                  setPreview("");
                  setImageFailed(false);
                  setSavedImage(false);
                  setImageError(null);
                }}
              />
            </label>
            {imageError && (
              <p className="product-photo__error" role="alert">
                {imageError.error}
                {imageError.reference && (
                  <small>Support reference: {imageError.reference}</small>
                )}
              </p>
            )}
          </aside>
        </div>
        <footer className="product-editor__footer">
          <p>
            {!categories.length
              ? "Add a category before creating a product."
              : "Changes appear across your website."}
          </p>
          <div>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={busy || !categories.length}
            >
              {pending ? (
                <>
                  <LoaderCircle size={15} className="product-editor__spinner" />
                  Saving…
                </>
              ) : (
                "Save product"
              )}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
