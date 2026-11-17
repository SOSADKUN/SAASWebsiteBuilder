import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("@/server/order-service", () => ({
  operationsSnapshot: mocks.snapshot,
}));
import { GET } from "../src/app/api/orders/route";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.resetAllMocks());
describe("orders sync endpoint", () => {
  it("returns a safe forbidden response for a disabled or expired module", async () => {
    mocks.snapshot.mockRejectedValueOnce(
      new Error("Business module is disabled or not entitled"),
    );
    const response = await GET(
      new NextRequest(
        "https://servqo.example/api/orders?merchantId=11111111-1111-4111-8111-111111111111",
      ),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("module is disabled");
  });
  it("returns uncached tenant-scoped snapshots", async () => {
    mocks.snapshot.mockResolvedValue({ orders: [] });
    const response = await GET(
      new NextRequest(
        `https://servqo.example/api/orders?merchantId=${id}&menu=1`,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(mocks.snapshot).toHaveBeenCalledWith(id, true);
  });
  it("rejects invalid IDs without querying", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "https://servqo.example/api/orders?merchantId=invalid",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("returns sign-in feedback when the session expires", async () => {
    mocks.snapshot.mockRejectedValue({
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
    const response = await GET(
      new NextRequest(`https://servqo.example/api/orders?merchantId=${id}`),
    );
    expect(response.status).toBe(401);
  });
  it.each([
    ["Business access denied", 403],
    ["private SQL and credentials", 503],
  ])("does not expose raw errors: %s", async (message, status) => {
    mocks.snapshot.mockRejectedValue(new Error(message));
    const response = await GET(
      new NextRequest(`https://servqo.example/api/orders?merchantId=${id}`),
    );
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain(message);
  });
});
