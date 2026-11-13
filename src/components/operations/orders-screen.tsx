"use client";
import { useState, useTransition } from "react";
import {
  ClipboardList,
  ChefHat,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";
import { nextOrderStatus, type Order } from "@/lib/order-policy";
import { changeOrder, acknowledgeCancellation } from "@/server/order-actions";
import { useOperations } from "./use-operations";
import { OperationsFrame } from "./operations-frame";
import { OrderTicket } from "./order-ticket";
export function OrdersScreen({
  merchantId,
  enabled,
}: {
  merchantId: string;
  enabled: boolean;
}) {
  const sync = useOperations(merchantId);
  const [history, setHistory] = useState(false),
    [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const cancellations = sync.data.orders.filter(
    (order) =>
      order.status === "cancelled" && !order.cancellationAcknowledgedAt,
  );
  const closed = sync.data.orders.filter(
    (order) =>
      order.status === "completed" ||
      (order.status === "cancelled" && order.cancellationAcknowledgedAt),
  );
  function perform(order: Order, ack = false) {
    setError("");
    startTransition(async () => {
      try {
        const result = ack
          ? await acknowledgeCancellation(merchantId, {
              orderId: order.id,
              version: order.version,
            })
          : await changeOrder(merchantId, {
              orderId: order.id,
              version: order.version,
              status: nextOrderStatus[order.status]!,
              reason: "",
            });
        if (!result.ok)
          setError(`${result.error} Support reference: ${result.reference}`);
      } catch {
        setError(
          "The update could not be confirmed. Check the latest ticket status before trying again.",
        );
      } finally {
        sync.refresh();
      }
    });
  }
  const columns = [
    {
      status: "pending",
      title: "Pending",
      subtitle: "New tickets to pick up",
      icon: ClipboardList,
    },
    {
      status: "preparing",
      title: "Preparing",
      subtitle: "A little care in every order",
      icon: ChefHat,
    },
    {
      status: "ready",
      title: "Ready",
      subtitle: "Ready for the counter",
      icon: PackageCheck,
    },
  ] as const;
  return (
    <OperationsFrame title="Orders" className="orders-screen" sync={sync}>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {cancellations.length > 0 && (
        <section
          className="ops-cancellations"
          aria-label="Cancellations needing attention"
        >
          <div className="ops-cancellation-heading" role="alert">
            <AlertTriangle size={22} />
            <div>
              <h2>
                {cancellations.length} cancellation
                {cancellations.length !== 1 ? "s" : ""} to acknowledge
              </h2>
              <p>
                Stop preparation for these tickets. Acknowledge after the
                kitchen has seen the change.
              </p>
            </div>
          </div>
          <div className="ops-recent">
            {cancellations.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                mode="kitchen"
                busy={pending || sync.status !== "live"}
                onAcknowledge={(order) => perform(order, true)}
              />
            ))}
          </div>
        </section>
      )}
      <div className="ops-view-tabs">
        <button
          className={!history ? "active" : ""}
          aria-pressed={!history}
          onClick={() => setHistory(false)}
        >
          Live queue{" "}
          <span>
            {
              sync.data.orders.filter((order) =>
                ["pending", "preparing", "ready"].includes(order.status),
              ).length
            }
          </span>
        </button>
        <button
          className={history ? "active" : ""}
          aria-pressed={history}
          onClick={() => setHistory(true)}
        >
          Recent history <span>{closed.length}</span>
        </button>
      </div>
      {history ? (
        <>
          <p className="ops-muted">
            The latest 50 completed or acknowledged tickets. Full records remain
            available in your business export.
          </p>
          <div className="ops-recent">
            {closed.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                mode="kitchen"
                busy={pending}
              />
            ))}
          </div>
          {!closed.length && (
            <div className="ops-empty">
              <ClipboardList size={32} />
              <h3>No completed tickets yet.</h3>
            </div>
          )}
        </>
      ) : (
        <div className="orders-board">
          {columns.map((column) => {
            const tickets = sync.data.orders.filter(
              (order) => order.status === column.status,
            );
            return (
              <section
                key={column.status}
                className={`orders-column orders-column--${column.status}`}
                aria-label={`${column.title} orders`}
              >
                <header>
                  <div>
                    <column.icon size={19} />
                    <h2>{column.title}</h2>
                    <span>{tickets.length}</span>
                  </div>
                </header>
                <div className="orders-column__tickets">
                  {tickets.map((order) => (
                    <OrderTicket
                      key={order.id}
                      order={order}
                      mode="kitchen"
                      busy={pending || !enabled || sync.status !== "live"}
                      onAdvance={(order) => perform(order)}
                    />
                  ))}
                  {!tickets.length && (
                    <div className="ops-empty">
                      <column.icon size={29} strokeWidth={1.3} />
                      <p>
                        {sync.status === "connecting"
                          ? "Loading tickets…"
                          : sync.status === "error"
                            ? "Waiting for connection"
                            : "All clear here"}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </OperationsFrame>
  );
}
