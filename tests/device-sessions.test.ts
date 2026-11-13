import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), supabase: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  supabase: mocks.supabase,
  authorize: vi.fn(),
  user: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/db", () => ({ db: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: vi.fn(),
}));
vi.mock("@/lib/subscription-service", () => ({ requireSubscription: vi.fn() }));
import { signOut } from "../src/server/actions";
describe("independent device sessions", () => {
  it("signs out only this device and leaves the second device session intact", async () => {
    mocks.supabase.mockResolvedValue({ auth: { signOut: mocks.signOut } });
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("redirect:/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
