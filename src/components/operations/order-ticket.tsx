"use client";
import { Clock, Check, ChefHat, PackageCheck, XCircle } from "lucide-react";
import {
  formatMoney,
  formatOrderNumber,
  nextOrderStatus,
  statusLabels,
  type Order,
} from "@/lib/order-policy";
const actionLabels = {
  preparing: "Start preparing",
  ready: "Mark ready",
  completed: "Complete order",
};
export function OrderTicket({
  order,
  mode,
  busy,
  onAdvance,
  onCancel,
  onAcknowledge,
}: {
  order: Order;
  mode: "cashier" | "kitchen";
  busy: boolean;
  onAdvance?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onAcknowledge?: (order: Order) => void;
}) {
  const next = nextOrderStatus[order.status];
  return (
    <article
      className={`order-ticket order-ticket--${mode} order-ticket--${order.status}`}
      data-order-id={order.id}
    >
      <header>
        <div>
          <strong>{formatOrderNumber(order.number)}</strong>
          <span>
            {order.fulfillment === "takeaway"
              ? "Takeaway"
              : order.tableLabel
                ? `Table ${order.tableLabel}`
                : "Dine-in"}
          </span>
        </div>
        <span className={`order-status ${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </header>
      <p className="order-ticket__time">
        <Clock size={12} />
        {new Date(order.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        <span>
          {order.payment === "cash" ? "Cash recorded" : "Payment due"}
        </span>
      </p>
      <ul>
        {order.items.map((item) => (
          <li key={item.id}>
            <b>{item.quantity}×</b>
            <span>{item.name}</span>
            {mode === "cashier" && <small>{formatMoney(item.lineTotal)}</small>}
          </li>
        ))}
      </ul>
      {order.note && (
        <p className="order-ticket__note">
          <b>Note</b> {order.note}
        </p>
      )}
      {order.status === "cancelled" && (
        <div className="order-ticket__cancel">
          <XCircle size={16} />
          <div>
            <b>Stop preparation — cancelled</b>
            <p>{order.cancelReason}</p>
            {order.payment === "cash" && (
              <small>
                Cash was recorded. Handle any refund at the counter.
              </small>
            )}
          </div>
        </div>
      )}
      <footer>
        <strong>{formatMoney(order.total)}</strong>
        <div>
          {mode === "kitchen" && next && (
            <button
              className="button primary compact"
              disabled={busy}
              onClick={() => onAdvance?.(order)}
            >
              {next === "preparing" ? (
                <ChefHat size={14} />
              ) : (
                <PackageCheck size={14} />
              )}{" "}
              {actionLabels[next as keyof typeof actionLabels]}
            </button>
          )}
          {mode === "cashier" && order.status === "pending" && (
            <button
              className="button compact ops-danger-text"
              disabled={busy}
              onClick={() => onCancel?.(order)}
            >
              Cancel order
            </button>
          )}
          {order.status === "cancelled" &&
            !order.cancellationAcknowledgedAt &&
            mode === "kitchen" && (
              <button
                className="button compact"
                disabled={busy}
                onClick={() => onAcknowledge?.(order)}
              >
                <Check size={14} />
                Acknowledge cancellation
              </button>
            )}
        </div>
      </footer>
      {order.cancellationAcknowledgedAt && (
        <small className="order-ticket__ack">
          <Check size={12} /> Kitchen acknowledged cancellation
        </small>
      )}
      <details className="order-ticket__history">
        <summary>Activity · {order.events.length} updates</summary>
        <ol>
          {order.events.map((event) => (
            <li key={event.id}>
              <span>
                {new Date(event.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div>
                {event.kind === "cancellation_acknowledged"
                  ? "Cancellation acknowledged"
                  : event.kind === "created"
                    ? "Sent from cashier"
                    : statusLabels[event.toStatus]}
                {event.reason && <small>{event.reason}</small>}
              </div>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
