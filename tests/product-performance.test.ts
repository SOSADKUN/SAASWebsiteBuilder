import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  subscription: vi.fn(),
  category: vi.fn(),
  values: vi.fn(),
  db: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  user: vi.fn(),
  admin: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/lib/subscription-service", () => ({
  requireSubscription: mocks.subscription,
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));
import { saveMenuProduct } from "../src/server/actions";
beforeEach(() => {
  vi.resetAllMocks();
});
describe("product save latency and authorization gates", () => {
  it("overlaps independent reads after authorization and waits for both before inserting", async () => {
    let authorize!: (value: unknown) => void;
    let subscription!: () => void;
    let category!: (value: unknown) => void;
    mocks.authorize.mockReturnValue(
      new Promise((resolve) => {
        authorize = resolve;
      }),
    );
    mocks.subscription.mockReturnValue(
      new Promise<void>((resolve) => {
        subscription = resolve;
      }),
    );
    mocks.category.mockReturnValue(
      new Promise((resolve) => {
        category = resolve;
      }),
    );
    mocks.values.mockResolvedValue(undefined);
    mocks.db.mockReturnValue({
      query: { categories: { findFirst: mocks.category } },
      insert: () => ({ values: mocks.values }),
    });
    const merchantId = "11111111-1111-4111-8111-111111111111",
      categoryId = "22222222-2222-4222-8222-222222222222";
    const saving = saveMenuProduct(merchantId, {
      name: "Coffee",
      description: "",
      price: 100,
      image: "",
      categoryId,
      available: true,
      position: 0,
    });
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.subscription).not.toHaveBeenCalled();
    authorize({ id: "owner" });
    await vi.waitFor(() => {
      expect(mocks.subscription).toHaveBeenCalled();
      expect(mocks.category).toHaveBeenCalled();
    });
    expect(mocks.values).not.toHaveBeenCalled();
    category({ id: categoryId });
    await Promise.resolve();
    expect(mocks.values).not.toHaveBeenCalled();
    subscription();
    expect(await saving).toEqual({ ok: true });
    expect(mocks.values).toHaveBeenCalledOnce();
  });
});
