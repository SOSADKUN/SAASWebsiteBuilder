"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Coffee,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Send,
  CheckCircle2,
  Trash2,
  ReceiptText,
} from "lucide-react";
import type { DashboardData } from "@/components/dashboard/types";
import { formatMoney, formatOrderNumber, type Order } from "@/lib/order-policy";
import { placeOrder, changeOrder } from "@/server/order-actions";
import { useOperations } from "./use-operations";
import { usePosDraft } from "./use-pos-draft";
import { SyncStatus } from "./sync-status";
import { OrderTicket } from "./order-ticket";
import { CancelOrderDialog } from "./cancel-order-dialog";
function CatalogImage({ src }: { src: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  useEffect(() => {
    const retry = () => setFailedSource(null);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, []);
  return src && failedSource !== src ? (
    <img src={src} alt="" loading="lazy" onError={() => setFailedSource(src)} />
  ) : (
    <Coffee size={32} strokeWidth={1.3} />
  );
}
export function PosScreen({
  data,
  enabled,
}: {
  data: DashboardData;
  enabled: boolean;
}) {
  const sync = useOperations(data.business.id, true);
  const { draft, update, clear } = usePosDraft(data.business.id);
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<number | null>(null),
    [cancelId, setCancelId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cashInput = useRef<HTMLInputElement>(null);
  const products = sync.data.products ?? data.products,
    categories = sync.data.categories ?? data.categories;
  const lines = draft.lines.map((line) => ({
    ...line,
    product: products.find((product) => product.id === line.productId),
  }));
  const total = lines.reduce(
    (sum, line) => sum + (line.product?.price ?? line.price) * line.quantity,
    0,
  );
  const unavailable = lines.some((line) => !line.product?.available);
  const locked = pending || draft.uncertain;
  const confirmed = draft.uncertain
    ? sync.data.orders.find((order) => order.requestId === draft.requestId)
    : undefined;
  const cancelOrder = sync.data.orders.find((order) => order.id === cancelId);
  const cash = draft.cash === "" ? total : Math.round(Number(draft.cash) * 100);
  function addProduct(id: string) {
    if (locked || !enabled) return;
    const product = products.find(
      (product) => product.id === id && product.available,
    );
    if (!product) return;
    const line = draft.lines.find((line) => line.productId === id);
    if ((line?.quantity ?? 0) >= 99 || (!line && draft.lines.length >= 40)) {
      setError("A bill supports up to 40 products, with 99 of each.");
      return;
    }
    setError("");
    setReceipt(null);
    update((current) => {
      const existing = current.lines.find((item) => item.productId === id);
      if (
        (existing?.quantity ?? 0) >= 99 ||
        (!existing && current.lines.length >= 40)
      )
        return current;
      return {
        ...current,
        lines: existing
          ? current.lines.map((item) =>
              item.productId === id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [
              ...current.lines,
              {
                productId: id,
                name: product.name,
                price: product.price,
                quantity: 1,
              },
            ],
      };
    });
  }
  function quantity(id: string, change: number) {
    if (locked) return;
    update((current) => ({
      ...current,
      lines: current.lines
        .map((line) =>
          line.productId === id
            ? { ...line, quantity: Math.min(99, line.quantity + change) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    }));
  }
  function submit() {
    if (
      pending ||
      !draft.lines.length ||
      !enabled ||
      unavailable ||
      sync.status !== "live"
    )
      return;
    if (
      draft.payment === "cash" &&
      cashInput.current &&
      !cashInput.current.reportValidity()
    )
      return;
    if (
      draft.payment === "cash" &&
      (!Number.isSafeInteger(cash) || cash < total)
    ) {
      setError("Cash received must cover the order total.");
      return;
    }
    setError("");
    const input = {
      requestId: draft.requestId,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        expectedPrice: line.product!.price,
      })),
      fulfillment: draft.fulfillment,
      tableLabel: draft.tableLabel,
      note: draft.note,
      payment: draft.payment,
      ...(draft.payment === "cash" ? { cashReceived: cash } : {}),
    };
    update((current) => ({ ...current, uncertain: true }));
    startTransition(async () => {
      try {
        const result = await placeOrder(data.business.id, input);
        if (!result.ok) {
          setError(`${result.error} Support reference: ${result.reference}`);
          if (
            [
              "VALIDATION",
              "MENU_CHANGED",
              "INVALID_TOTAL",
              "INSUFFICIENT_CASH",
              "FORBIDDEN",
              "SETUP_PENDING",
              "SUBSCRIPTION",
            ].includes(result.code)
          )
            update((current) => ({ ...current, uncertain: false }));
          sync.refresh();
          return;
        }
        clear();
        setReceipt(result.number);
        sync.refresh();
      } catch {
        setError(
          "The connection dropped before the order was confirmed. Retry this bill to check the same ticket; it will not create a duplicate.",
        );
      }
    });
  }
  function cancel(order: Order, reason: string) {
    startTransition(async () => {
      try {
        const result = await changeOrder(data.business.id, {
          orderId: order.id,
          version: order.version,
          status: "cancelled",
          reason,
        });
        if (!result.ok) {
          setError(`${result.error} Support reference: ${result.reference}`);
          sync.refresh();
          return;
        }
        setCancelId(null);
        setError("");
        sync.refresh();
      } catch {
        setError(
          "Cancellation could not be confirmed. Check the ticket before trying again.",
        );
        sync.refresh();
      }
    });
  }
  const filtered = products.filter(
    (product) =>
      product.available &&
      (category === "all" || product.categoryId === category) &&
      product.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="operations pos-screen">
      <div className="ops-heading">
        <div>
          <span className="eyebrow">GOOD SERVICE STARTS HERE</span>
          <h1>POS / Cashier</h1>
          <p>Build the bill. Send it straight to the kitchen.</p>
        </div>
        <SyncStatus sync={sync} />
      </div>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {receipt !== null && (
        <div className="ops-success" role="status">
          <CheckCircle2 size={19} />
          <span>
            Order <b>{formatOrderNumber(receipt)}</b> sent to the kitchen.
          </span>
          <button
            className="icon-button"
            aria-label="Dismiss order confirmation"
            onClick={() => setReceipt(null)}
          >
            ×
          </button>
        </div>
      )}
      <div className="pos-workspace">
        <section className="pos-menu" aria-label="Menu products">
          <label className="pos-search">
            <Search size={17} />
            <input
              aria-label="Search POS menu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your menu…"
            />
          </label>
          <div className="pos-categories" aria-label="Menu categories">
            <button
              className={category === "all" ? "active" : ""}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              All items{" "}
              <span>
                {products.filter((product) => product.available).length}
              </span>
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                className={category === item.id ? "active" : ""}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="pos-product-grid">
            {filtered.map((product) => (
              <button
                key={product.id}
                className="pos-product"
                disabled={locked || !enabled}
                onClick={() => addProduct(product.id)}
                aria-label={`Add ${product.name} to bill`}
              >
                <span className="pos-product__image">
                  <CatalogImage src={product.image} />
                </span>
                <span className="pos-product__name">{product.name}</span>
                <span className="pos-product__price">
                  {formatMoney(product.price)}
                  <Plus size={17} />
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="ops-empty">
              <Coffee size={34} />
              <h3>No menu items here yet.</h3>
              <p>
                Add available products in Menu Management, or try another
                category.
              </p>
            </div>
          )}
        </section>
        <aside className="pos-bill" aria-label="Current bill">
          <header>
            <div>
              <ReceiptText size={19} />
              <h2>Current bill</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Clear unsent bill"
              disabled={locked || !draft.lines.length}
              onClick={() => {
                if (
                  window.confirm(
                    "Clear this unsent bill? Nothing has been sent to the kitchen.",
                  )
                )
                  clear();
              }}
            >
              <Trash2 size={16} />
            </button>
          </header>
          {confirmed ? (
            <div className="pos-confirmed">
              <CheckCircle2 size={34} />
              <h3>{formatOrderNumber(confirmed.number)} is confirmed</h3>
              <p>
                The saved ticket is already visible to the kitchen. No duplicate
                order was created.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  clear();
                  setError("");
                }}
              >
                Start next bill
              </button>
            </div>
          ) : (
            <>
              <fieldset className="pos-bill__fields" disabled={locked}>
                <div className="pos-fulfillment">
                  {(["dine_in", "takeaway"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={draft.fulfillment === mode ? "active" : ""}
                      aria-pressed={draft.fulfillment === mode}
                      onClick={() =>
                        update((current) => ({ ...current, fulfillment: mode }))
                      }
                    >
                      {mode === "dine_in" ? "Dine-in" : "Takeaway"}
                    </button>
                  ))}
                </div>
                {draft.fulfillment === "dine_in" && (
                  <label>
                    Table / reference <span>Optional</span>
                    <input
                      value={draft.tableLabel}
                      maxLength={40}
                      placeholder="e.g. 04"
                      onChange={(event) =>
                        update((current) => ({
                          ...current,
                          tableLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}
              </fieldset>
              <div className="pos-bill__lines">
                {!lines.length ? (
                  <div className="ops-empty">
                    <ShoppingBag size={30} />
                    <p>Tap a menu item to start an order.</p>
                  </div>
                ) : (
                  lines.map((line) => (
                    <div
                      className={`pos-line ${!line.product?.available ? "unavailable" : ""}`}
                      key={line.productId}
                    >
                      <div>
                        <b>{line.product?.name ?? line.name}</b>
                        <small>
                          {line.product?.available
                            ? formatMoney(line.product.price)
                            : "Unavailable — remove from bill"}
                        </small>
                      </div>
                      <div className="pos-quantity">
                        <button
                          aria-label={`Remove one ${line.name}`}
                          disabled={locked}
                          onClick={() => quantity(line.productId, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          aria-label={`Add one ${line.name}`}
                          disabled={locked || line.quantity >= 99}
                          onClick={() => quantity(line.productId, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <strong>
                        {formatMoney(
                          (line.product?.price ?? line.price) * line.quantity,
                        )}
                      </strong>
                    </div>
                  ))
                )}
              </div>
              <fieldset className="pos-bill__fields" disabled={locked}>
                <label>
                  Kitchen note <span>Optional</span>
                  <textarea
                    rows={2}
                    maxLength={400}
                    placeholder="e.g. No sugar, serve drinks first"
                    value={draft.note}
                    onChange={(event) =>
                      update((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="pos-payment">
                  <label>
                    Payment
                    <select
                      value={draft.payment}
                      onChange={(event) =>
                        update((current) => ({
                          ...current,
                          payment: event.target.value as "cash" | "unpaid",
                        }))
                      }
                    >
                      <option value="cash">Cash received</option>
                      <option value="unpaid">Payment due</option>
                    </select>
                  </label>
                  {draft.payment === "cash" && (
                    <label>
                      Cash given (RM)
                      <input
                        ref={cashInput}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="20000000"
                        step="0.01"
                        value={draft.cash}
                        placeholder={(total / 100).toFixed(2)}
                        onChange={(event) =>
                          update((current) => ({
                            ...current,
                            cash: event.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                </div>
              </fieldset>
              <footer>
                <div className="pos-total">
                  <span>Total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                {draft.payment === "cash" && (
                  <p className="pos-change">
                    Change <b>{formatMoney(Math.max(0, cash - total))}</b>
                  </p>
                )}
                {draft.uncertain && !pending && (
                  <p className="ops-callout">
                    Awaiting confirmation. Retry uses the same bill ID to
                    prevent duplicates.
                  </p>
                )}
                <button
                  className="button primary pos-send"
                  disabled={
                    pending ||
                    !draft.lines.length ||
                    !enabled ||
                    unavailable ||
                    sync.status !== "live"
                  }
                  onClick={submit}
                >
                  <Send size={16} />
                  {pending
                    ? "Sending to kitchen…"
                    : draft.uncertain
                      ? "Retry / confirm this order"
                      : "Send order to kitchen"}
                </button>
                <small>
                  Cash is recorded manually. No card payment is processed.
                </small>
              </footer>
            </>
          )}
        </aside>
      </div>
      <div className="ops-section-heading">
        <div>
          <h2>Recent tickets</h2>
          <p>
            Submitted tickets stay visible here. Cancel with a reason if a bill
            was sent by mistake.
          </p>
        </div>
        <span>{sync.data.orders.length} tickets</span>
      </div>
      <div className="ops-recent">
        {sync.data.orders
          .slice()
          .sort((a, b) => b.number - a.number)
          .slice(0, 8)
          .map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              mode="cashier"
              busy={pending}
              onCancel={(order) => {
                setError("");
                setCancelId(order.id);
              }}
            />
          ))}
      </div>
      {!sync.data.orders.length && sync.status === "live" && (
        <p className="ops-muted">
          Submitted orders will appear here and on the Orders screen.
        </p>
      )}
      {cancelOrder && (
        <CancelOrderDialog
          order={cancelOrder}
          busy={pending}
          error={error}
          onClose={() => setCancelId(null)}
          onConfirm={(reason) => cancel(cancelOrder, reason)}
        />
      )}
    </section>
  );
}
