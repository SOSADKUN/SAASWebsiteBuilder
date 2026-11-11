import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  db: vi.fn(),
  membership: vi.fn(),
  subscriptionSnapshot: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ user: mocks.user }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/subscription-service", () => ({
  subscriptionSnapshot: mocks.subscriptionSnapshot,
}));
import { dashboardData } from "../src/server/queries";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
  mocks.db.mockReturnValue({
    query: { memberships: { findFirst: mocks.membership } },
  });
});
describe("dashboard authorization reuse", () => {
  it("shows onboarding when the authenticated user has no membership", async () => {
    mocks.membership.mockResolvedValue(null);
    expect(await dashboardData()).toBe(null);
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptionSnapshot).not.toHaveBeenCalled();
  });
  it("denies a role without the requested capability before reading tenant content", async () => {
    mocks.membership.mockResolvedValue({
      merchantId: "merchant-1",
      role: "viewer",
    });
    await expect(dashboardData("website:manage")).rejects.toThrow(
      "Workspace permission required",
    );
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptionSnapshot).not.toHaveBeenCalled();
  });
  it("does not query a database for an unauthenticated request", async () => {
    mocks.user.mockRejectedValue(new Error("Login required"));
    await expect(dashboardData()).rejects.toThrow("Login required");
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
