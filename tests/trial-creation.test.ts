import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  db: vi.fn(),
  claim: vi.fn(),
  inserted: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  user: mocks.user,
  authorize: vi.fn(),
  admin: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/lib/subscription-service", () => ({ requireSubscription: vi.fn() }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { createBusiness } from "../src/server/actions";
import { merchantTrialClaims, merchants } from "../src/db/schema";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user-uuid", email: "owner@example.com" });
  mocks.db.mockReturnValue({
    transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        execute: vi.fn().mockResolvedValue([]),
        insert: (table: unknown) => ({
          values: (value: unknown) => {
            mocks.inserted(table, value);
            const response = {
              returning: async () => [{ id: "new-merchant" }],
              onConflictDoNothing: () => ({ returning: mocks.claim }),
            };
            return table === merchantTrialClaims
              ? { onConflictDoNothing: () => ({ returning: mocks.claim }) }
              : response;
          },
        }),
      }),
  });
});
describe("merchant trial creation boundary", () => {
  it("claims the authenticated subject ID and relies on database timestamps", async () => {
    mocks.claim.mockResolvedValue([{ userId: "user-uuid" }]);
    const form = new FormData();
    form.set("name", "My cafe");
    form.set("slug", "my-cafe");
    form.set("trial_ends_at", "2099-01-01");
    await expect(createBusiness(form)).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.inserted).toHaveBeenCalledWith(merchantTrialClaims, {
      userId: "user-uuid",
      merchantId: "new-merchant",
    });
    expect(mocks.inserted).toHaveBeenCalledWith(merchants, {
      name: "My cafe",
      slug: "my-cafe",
    });
  });
  it("rejects a repeated business trial claim inside the creation transaction", async () => {
    mocks.claim.mockResolvedValue([]);
    const form = new FormData();
    form.set("name", "Another cafe");
    form.set("slug", "another-cafe");
    await expect(createBusiness(form)).rejects.toThrow(
      "already created a trial business",
    );
    expect(mocks.inserted).toHaveBeenCalledTimes(3);
  });
});
