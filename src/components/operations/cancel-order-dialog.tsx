"use client";
import { useEffect, useRef, useState } from "react";
import { XCircle } from "lucide-react";
import {
  formatOrderNumber,
  statusLabels,
  type Order,
} from "@/lib/order-policy";
export function CancelOrderDialog({
  order,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  order: Order;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ops-cancel-dialog"
      aria-labelledby="cancel-order-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) onConfirm(reason);
        }}
      >
        <XCircle size={30} />
        <h2 id="cancel-order-title">
          Cancel {formatOrderNumber(order.number)}?
        </h2>
        <p>
          Current status: <b>{statusLabels[order.status]}</b>. The kitchen will
          see a cancellation alert and must acknowledge it. This ticket stays in
          the order history.
        </p>
        {error && (
          <p className="ops-error" role="alert">
            {error}
          </p>
        )}
        {order.status === "preparing" && (
          <p className="ops-callout">
            Preparation has started. Tell the kitchen immediately as well.
          </p>
        )}
        {order.payment === "cash" && (
          <p>Cash was recorded. This action does not issue a refund.</p>
        )}
        <label>
          Cancellation reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={240}
            rows={2}
            placeholder="e.g. Duplicate order or customer changed their mind"
            disabled={busy}
          />
        </label>
        <div>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Keep order
          </button>
          <button
            className="button ops-danger"
            disabled={busy || reason.trim().length < 3}
          >
            {busy ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
