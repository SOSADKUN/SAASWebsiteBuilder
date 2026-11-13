"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMedia } from "@/server/workspace-actions";

export function DeleteMediaDialog({
  merchantId,
  asset,
  onClose,
  onDeleted,
}: {
  merchantId: string;
  asset: { id: string; name: string; url: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="media-delete-dialog"
      aria-labelledby="delete-media-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <Trash2 size={24} />
      <h2 id="delete-media-title">Delete this image?</h2>
      <img src={asset.url} alt="" />
      <b>{asset.name}</b>
      <p>
        This permanently removes the image from your library and Supabase
        Storage. Any website or menu using its URL will lose the image. This
        cannot be undone.
      </p>
      {error && (
        <p className="media-delete-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button className="button" disabled={pending} onClick={onClose}>
          Keep image
        </button>
        <button
          className="button media-delete-button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError("");
              try {
                const result = await deleteMedia(merchantId, asset.id);
                if (result.ok) onDeleted();
                else setError(`${result.error} Reference: ${result.reference}`);
              } catch {
                setError(
                  "Deletion could not be confirmed. Refresh the library before trying again.",
                );
              }
            })
          }
        >
          {pending ? "Deleting…" : "Delete image"}
        </button>
      </div>
    </dialog>
  );
}
