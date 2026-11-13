"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
const draftSchema = z.object({
  requestId: z.union([z.uuid(), z.literal("")]),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
        name: z.string().max(120),
        price: z.number().int().min(0).max(10000000),
      }),
    )
    .max(40),
  fulfillment: z.enum(["dine_in", "takeaway"]),
  tableLabel: z.string().max(40),
  note: z.string().max(400),
  payment: z.enum(["cash", "unpaid"]),
  cash: z.string().max(16),
  uncertain: z.boolean(),
});
export type PosDraft = z.infer<typeof draftSchema>;
const empty: PosDraft = {
  requestId: "",
  lines: [],
  fulfillment: "dine_in",
  tableLabel: "",
  note: "",
  payment: "cash",
  cash: "",
  uncertain: false,
};
type Store = {
  getSnapshot: () => PosDraft;
  subscribe: (listener: () => void) => () => void;
  update: (change: (draft: PosDraft) => PosDraft) => void;
};
const stores = new Map<string, Store>();
function getStore(key: string) {
  if (stores.has(key)) return stores.get(key)!;
  let value = empty;
  try {
    const parsed = draftSchema.safeParse(
      JSON.parse(sessionStorage.getItem(key) || "null"),
    );
    if (parsed.success) value = parsed.data;
  } catch {
    /* Storage is optional; retain the in-memory draft. */
  }
  const listeners = new Set<() => void>();
  const store: Store = {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update: (change) => {
      const changed = change(value);
      value = {
        ...changed,
        requestId:
          changed.lines.length && !changed.requestId
            ? crypto.randomUUID()
            : changed.requestId,
      };
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Retain the bill in memory if storage is unavailable. */
      }
      listeners.forEach((listener) => listener());
    },
  };
  stores.set(key, store);
  return store;
}
export function usePosDraft(merchantId: string) {
  const key = `servqo.pos.draft.${merchantId}`;
  const store = useMemo(
    () => (typeof window === "undefined" ? null : getStore(key)),
    [key],
  );
  const subscribe = useCallback(
    (listener: () => void) => {
      return store?.subscribe(listener) ?? (() => {});
    },
    [store],
  );
  const getSnapshot = useCallback(() => store?.getSnapshot() ?? empty, [store]);
  const draft = useSyncExternalStore(subscribe, getSnapshot, () => empty);
  const update = useCallback(
    (change: (draft: PosDraft) => PosDraft) => {
      store?.update(change);
    },
    [store],
  );
  const clear = useCallback(
    () => update(() => ({ ...empty, lines: [] })),
    [update],
  );
  return { draft, update, clear };
}
