import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  subscription: vi.fn(),
  db: vi.fn(),
  definition: vi.fn(),
  values: vi.fn(),
  conflict: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  user: vi.fn(),
  admin: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/lib/subscription-service", () => ({
  requireSubscription: mocks.subscription,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  redirect: vi.fn(),
}));
import {
  unlockDesignDemo,
  saveEditorLayout,
} from "../src/server/design-actions";
import { initialLayout } from "../src/lib/models";
const merchant = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ id: "owner" });
  mocks.subscription.mockResolvedValue(undefined);
  mocks.definition.mockResolvedValue({
    key: "header-centered",
    active: true,
    premium: true,
  });
  mocks.conflict.mockResolvedValue(undefined);
  mocks.values.mockReturnValue({ onConflictDoNothing: mocks.conflict });
  mocks.db.mockReturnValue({
    query: { componentDefinitions: { findFirst: mocks.definition } },
    insert: () => ({ values: mocks.values }),
  });
});
describe("explicit demo design unlock", () => {
  it("records merchant-scoped demo ownership idempotently without marking it as paid", async () => {
    expect(await unlockDesignDemo(merchant, "header-centered")).toEqual({
      ok: true,
      key: "header-centered",
    });
    expect(mocks.values).toHaveBeenCalledWith({
      merchantId: merchant,
      componentKey: "header-centered",
      source: "demo",
    });
    expect(mocks.conflict).toHaveBeenCalledOnce();
  });
  it("rejects unauthorized, expired and inactive designs without granting access", async () => {
    mocks.authorize.mockRejectedValueOnce(Error("Business access denied"));
    expect((await unlockDesignDemo(merchant, "header-centered")).ok).toBe(
      false,
    );
    expect(mocks.db).not.toHaveBeenCalled();
    mocks.subscription.mockRejectedValueOnce(Error("Subscription required:"));
    expect((await unlockDesignDemo(merchant, "header-centered")).ok).toBe(
      false,
    );
    mocks.definition.mockResolvedValue(undefined);
    expect((await unlockDesignDemo(merchant, "header-centered")).ok).toBe(
      false,
    );
    expect(mocks.values).not.toHaveBeenCalled();
  });
  it("returns a safe error when entitlement storage fails", async () => {
    mocks.conflict.mockRejectedValueOnce(Error("private database details"));
    const result = await unlockDesignDemo(merchant, "header-centered");
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private database details");
  });
  it("returns safe editor failures and a useful missing-migration message", async () => {
    mocks.authorize.mockRejectedValueOnce(Error("private session details"));
    const denied = await saveEditorLayout(
      merchant,
      merchant,
      initialLayout(),
      0,
      false,
    );
    expect(denied.ok).toBe(false);
    expect(JSON.stringify(denied)).not.toContain("private session details");
    mocks.authorize.mockRejectedValueOnce(
      Object.assign(Error("private constraint details"), { code: "23503" }),
    );
    const migration = await saveEditorLayout(
      merchant,
      merchant,
      initialLayout(),
      0,
      false,
    );
    expect(migration.ok).toBe(false);
    expect(JSON.stringify(migration)).toContain("latest migrations");
  });
});
