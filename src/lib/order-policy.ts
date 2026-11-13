import { z } from "zod";
export const orderStatuses = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const nextOrderStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "completed",
};
export const createOrderSchema = z
  .object({
    requestId: z.uuid(),
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
          expectedPrice: z.number().int().min(0).max(10000000),
        }),
      )
      .min(1)
      .max(40),
    fulfillment: z.enum(["dine_in", "takeaway"]),
    tableLabel: z.string().trim().max(40).default(""),
    note: z.string().trim().max(400).default(""),
    payment: z.enum(["cash", "unpaid"]),
    cashReceived: z.number().int().min(0).max(2000000000).optional(),
  })
  .refine(
    (value) =>
      new Set(value.items.map((item) => item.productId)).size ===
      value.items.length,
    "Duplicate products are not allowed",
  );
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export const orderChangeSchema = z.object({
  orderId: z.uuid(),
  version: z.number().int().min(0),
  status: z.enum(orderStatuses),
  reason: z.string().trim().max(240).default(""),
});
export function canChangeOrder(from: OrderStatus, to: OrderStatus) {
  return (
    nextOrderStatus[from] === to ||
    (to === "cancelled" && ["pending", "preparing", "ready"].includes(from))
  );
}
export function formatMoney(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`;
}
export function formatOrderNumber(number: number) {
  return `#${String(number).padStart(4, "0")}`;
}
export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};
export type OrderEvent = {
  id: string;
  version: number;
  kind: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string;
  createdAt: string;
};
export type Order = {
  id: string;
  number: number;
  requestId: string;
  status: OrderStatus;
  version: number;
  fulfillment: "dine_in" | "takeaway";
  tableLabel: string;
  note: string;
  total: number;
  payment: "cash" | "unpaid";
  cashReceived: number | null;
  changeDue: number;
  createdAt: string;
  updatedAt: string;
  cancelReason: string | null;
  cancellationAcknowledgedAt: string | null;
  items: OrderItem[];
  events: OrderEvent[];
};
export type OperationsSnapshot = {
  orders: Order[];
  products?: {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    image: string;
    available: boolean;
    position: number;
  }[];
  categories?: { id: string; name: string; position: number }[];
};
export class OrderError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
