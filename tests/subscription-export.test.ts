import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  db: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authorize: mocks.authorize }));
vi.mock("@/db", () => ({ db: mocks.db }));
import { GET } from "../src/app/dashboard/export/route";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ id: "owner" });
  const tx = { select: () => ({ from: () => ({ where: async () => [] }) }) };
  mocks.transaction.mockImplementation(async (fn) => fn(tx));
  mocks.db.mockReturnValue({ transaction: mocks.transaction });
});
describe("merchant data export", () => {
  it("allows authorized export without a subscription or payment gate", async () => {
    const response = await GET(
      new NextRequest(
        `https://servqo.example/dashboard/export?merchantId=${id}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(id, "workspace:view");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });
    expect(await response.json()).toMatchObject({
      formatVersion: 1,
      products: [],
      pages: [],
      subscriptions: [],
    });
  });
  it("denies another tenant before querying any data", async () => {
    mocks.authorize.mockRejectedValue(new Error("Business access denied"));
    await expect(
      GET(
        new NextRequest(
          `https://servqo.example/dashboard/export?merchantId=${id}`,
        ),
      ),
    ).rejects.toThrow("access denied");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects malformed IDs without querying data", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "https://servqo.example/dashboard/export?merchantId=invalid",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
  });
});
