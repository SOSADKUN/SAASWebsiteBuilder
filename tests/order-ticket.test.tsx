import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderTicket } from "../src/components/operations/order-ticket";
import type { Order } from "../src/lib/order-policy";

const cancelled: Order = {
  id: "order",
  number: 4,
  requestId: "request",
  status: "cancelled",
  version: 1,
  fulfillment: "takeaway",
  tableLabel: "",
  note: "No sugar",
  total: 1000,
  payment: "cash",
  cashReceived: 1000,
  changeDue: 0,
  createdAt: "2026-11-13T08:00:00Z",
  updatedAt: "2026-11-13T08:01:00Z",
  cancelReason: "Duplicate bill",
  cancellationAcknowledgedAt: null,
  items: [
    {
      id: "item",
      productId: "product",
      name: "Latte",
      image: "",
      unitPrice: 1000,
      quantity: 1,
      lineTotal: 1000,
    },
  ],
  events: [],
};
describe("cancellation ticket presentation", () => {
  it("keeps unacknowledged kitchen cancellations urgent", () => {
    const html = renderToStaticMarkup(
      <OrderTicket order={cancelled} mode="kitchen" busy={false} />,
    );
    expect(html).toContain("Stop preparation");
    expect(html).toContain("Duplicate bill");
    expect(html).toContain("Acknowledge cancellation");
  });
  it("shows acknowledged cancellation as history rather than a new stop instruction", () => {
    const html = renderToStaticMarkup(
      <OrderTicket
        order={{
          ...cancelled,
          cancellationAcknowledgedAt: "2026-11-13T08:02:00Z",
        }}
        mode="cashier"
        busy={false}
      />,
    );
    expect(html).toContain("Cancellation reason");
    expect(html).toContain("Kitchen acknowledged");
    expect(html).toContain("Duplicate bill");
    expect(html).not.toContain("Stop preparation");
    expect(html).not.toContain("Cancel order");
    expect(html).toContain("Handle any refund at the counter");
  });
});
