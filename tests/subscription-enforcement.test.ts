import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  authorize: vi.fn(),
  transaction: vi.fn(),
  where: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  user: vi.fn(),
  admin: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { requireSubscription } from "../src/lib/subscription-service";
import { saveLayout, restoreDraft, unlock } from "../src/server/actions";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ id: "user" });
  mocks.where.mockResolvedValue([
    {
      serverNow: "2026-11-26T00:00:00Z",
      trialStartedAt: new Date("2026-11-11T00:00:00Z"),
      trialEndsAt: new Date("2026-11-25T00:00:00Z"),
      planName: "SERVQO",
      subscription: {
        status: "trialing",
        paymentVerifiedAt: null,
        currentPeriodEndsAt: null,
        verificationSource: null,
      },
    },
  ]);
  const query = { leftJoin: vi.fn(), where: mocks.where };
  query.leftJoin.mockReturnValue(query);
  mocks.db.mockReturnValue({
    query: { categories: { findFirst: vi.fn().mockResolvedValue(undefined) } },
    select: () => ({ from: () => query }),
    transaction: mocks.transaction,
  });
});
describe("server-side subscription enforcement", () => {
  it("fails closed when the subscription row is missing", async () => {
    mocks.where.mockResolvedValue([]);
    await expect(requireSubscription(id)).rejects.toThrow(
      "setup is incomplete",
    );
  });
  it("keeps the separate premium design demo gate after expiry", async () => {
    await expect(unlock(id, "hero-split")).rejects.toThrow(
      "Subscription required",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("allows reloading the saved draft after expiry because it is read-only", async () => {
    mocks.db.mockReturnValue({
      query: {
        pages: {
          findFirst: vi.fn().mockResolvedValue({ draft: [], revision: 1 }),
        },
      },
    });
    await expect(restoreDraft(id, id)).resolves.toEqual({
      sections: [],
      revision: 1,
    });
    expect(mocks.where).not.toHaveBeenCalled();
  });
  it("checks membership before loading subscription data", async () => {
    mocks.authorize.mockRejectedValue(new Error("Business access denied"));
    await expect(saveLayout(id, id, [], 0)).rejects.toThrow("access denied");
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
