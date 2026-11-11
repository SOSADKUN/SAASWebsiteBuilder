import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/server/queries", () => ({ dashboardData: mocks.load }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: { digest?: string }) => {
    if (error.digest?.startsWith("NEXT_REDIRECT;")) throw error;
  },
}));
vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: () => <h1>Existing dashboard</h1>,
}));
vi.mock("@/components/dashboard/workspace-onboarding", () => ({
  WorkspaceOnboarding: () => <h1>Create Your Business</h1>,
}));
import { DashboardScreen } from "../src/components/dashboard/dashboard-screen";
beforeEach(() => vi.resetAllMocks());
describe("dashboard route outcomes", () => {
  it("renders onboarding directly for a user without a merchant", async () => {
    mocks.load.mockResolvedValue(null);
    expect(renderToStaticMarkup(await DashboardScreen({}))).toContain(
      "Create Your Business",
    );
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it("renders the existing dashboard after membership is loaded", async () => {
    mocks.load.mockResolvedValue({ business: { id: "merchant" } });
    expect(renderToStaticMarkup(await DashboardScreen({}))).toContain(
      "Existing dashboard",
    );
  });
  it.each(["QUERY_TIMEOUT", "QUEUE_TIMEOUT", "42P01", "42501", "UNKNOWN"])(
    "shows a safe error and reference for %s without retrying automatically",
    async (code) => {
      mocks.load.mockRejectedValue({
        cause: { code, message: "private SQL token" },
      });
      const html = renderToStaticMarkup(await DashboardScreen({}));
      expect(html).toContain("Unable to load your workspace");
      expect(html).toMatch(/Support reference: [a-f0-9-]{36}/);
      expect(html).toContain('action="/dashboard"');
      expect(html).not.toContain("private SQL token");
      expect(mocks.load).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves authentication redirects", async () => {
    const redirect = { digest: "NEXT_REDIRECT;replace;/login;307;" };
    mocks.load.mockRejectedValue(redirect);
    await expect(DashboardScreen({})).rejects.toBe(redirect);
  });
});
