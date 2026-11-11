import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  user: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  user: mocks.user,
  authorize: vi.fn(),
  supabase: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/subscription-service", () => ({ requireSubscription: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "auth-redirect")
      throw error;
  },
}));
import { createWorkspace } from "../src/server/actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user", email: "owner@example.com" });
  mocks.db.mockReturnValue({ transaction: mocks.transaction });
});
function form() {
  const data = new FormData();
  data.set("name", "Test cafe");
  data.set("slug", "test-cafe");
  return data;
}
describe("workspace action feedback", () => {
  it("returns a safe inline migration error instead of the global error screen", async () => {
    mocks.transaction.mockRejectedValue({
      cause: { code: "42703", message: "private SQL" },
    });
    const result = await createWorkspace({ error: "" }, form());
    expect(result.error).toContain("pending database migration");
    expect(result.error).not.toContain("private SQL");
  });
  it("returns validation feedback without contacting the database", async () => {
    expect(
      (await createWorkspace({ error: "" }, new FormData())).error,
    ).toContain("valid website address");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("does not swallow authentication redirects", async () => {
    mocks.user.mockRejectedValue(new Error("auth-redirect"));
    await expect(createWorkspace({ error: "" }, form())).rejects.toThrow(
      "auth-redirect",
    );
  });
});
