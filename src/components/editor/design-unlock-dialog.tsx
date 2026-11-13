"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { definitions } from "@/lib/models";
import { formatDesignPrice } from "@/lib/design-pricing";
import { unlockDesignDemo } from "@/server/design-actions";
import type { DesignOffer } from "./design-picker";
export function DesignUnlockDialog({
  merchantId,
  offer,
  onClose,
  onUnlocked,
}: {
  merchantId: string;
  offer: DesignOffer;
  onClose: () => void;
  onUnlocked: (key: string) => void;
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
      className="design-unlock-dialog"
      aria-labelledby="design-unlock-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
    >
      <Lock size={24} />
      <h2 id="design-unlock-title">
        Unlock {definitions.find((d) => d.key === offer.key)?.name}
      </h2>
      <p className="design-price">
        {formatDesignPrice(offer.price)} <span>listed price</span>
      </p>
      <p>
        <b>Demo checkout — no payment collected.</b> Unlock this layout for your
        business to save and publish it. Colors, text and images remain
        customizable.
      </p>
      {error && (
        <p role="alert" className="design-checkout-error">
          {error}
        </p>
      )}
      <div>
        <button className="button" disabled={pending} onClick={onClose}>
          Keep previewing
        </button>
        <button
          className="button primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError("");
              try {
                const result = await unlockDesignDemo(merchantId, offer.key);
                if (result.ok) onUnlocked(result.key);
                else setError(`${result.error} Reference: ${result.reference}`);
              } catch {
                setError(
                  "Unlock could not be confirmed. Check your connection and try again.",
                );
              }
            })
          }
        >
          {pending ? "Unlocking…" : "Unlock for demo"}
        </button>
      </div>
    </dialog>
  );
}
