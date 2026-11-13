import { beforeEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  supabase: vi.fn(),
  reset: vi.fn(),
  getUser: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
  exchange: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ supabase: mocks.supabase }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Error(`REDIRECT:${path}`);
  },
}));
import {
  requestPasswordReset,
  updatePassword,
} from "../src/server/password-actions";
import { GET } from "../src/app/auth/recovery/route";
function form(password = "new-password", confirm = password) {
  const f = new FormData();
  f.set("email", "owner@example.test");
  f.set("password", password);
  f.set("confirm", confirm);
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://servqo.example");
  mocks.supabase.mockResolvedValue({
    auth: {
      resetPasswordForEmail: mocks.reset,
      getUser: mocks.getUser,
      updateUser: mocks.update,
      signOut: mocks.signOut,
      exchangeCodeForSession: mocks.exchange,
    },
  });
  mocks.reset.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user" } },
    error: null,
  });
  mocks.update.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.exchange.mockResolvedValue({ error: null });
});
it("requests recovery with a canonical PKCE callback and a non-enumerating confirmation", async () => {
  await expect(requestPasswordReset(form())).rejects.toThrow(
    "If+an+account+exists",
  );
  expect(mocks.reset).toHaveBeenCalledWith("owner@example.test", {
    redirectTo: "https://servqo.example/auth/recovery",
  });
});
it("rejects invalid email or mismatching passwords before contacting auth", async () => {
  const f = form();
  f.set("email", "bad");
  await expect(requestPasswordReset(f)).rejects.toThrow("Enter+a+valid");
  await expect(
    updatePassword(form("new-password", "different")),
  ).rejects.toThrow("matching+passwords");
  expect(mocks.supabase).not.toHaveBeenCalled();
});
it("never updates a password without a verified current user", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "expired" },
  });
  await expect(updatePassword(form())).rejects.toThrow("Request+a+new");
  expect(mocks.update).not.toHaveBeenCalled();
});
it("updates the authenticated user's password and signs out locally", async () => {
  await expect(updatePassword(form())).rejects.toThrow("Password+updated");
  expect(mocks.update).toHaveBeenCalledWith({ password: "new-password" });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("does not expose reset provider failures", async () => {
  mocks.reset.mockRejectedValue(Error("private-provider-details"));
  await expect(requestPasswordReset(form())).rejects.toThrow("Unable+to+send");
  mocks.update.mockRejectedValue(Error("private-provider-details"));
  await expect(updatePassword(form())).rejects.toThrow("Unable+to+update");
});
it("exchanges a recovery code before redirecting to reset, with private headers", async () => {
  const response = await GET(
    new NextRequest("https://servqo.example/auth/recovery?code=one-time-code"),
  );
  expect(mocks.exchange).toHaveBeenCalledWith("one-time-code");
  expect(response.headers.get("location")).toBe(
    "https://servqo.example/reset-password",
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});
it("fails closed for missing or failed recovery codes", async () => {
  const missing = await GET(
    new NextRequest("https://servqo.example/auth/recovery"),
  );
  expect(missing.headers.get("location")).toContain("/forgot-password");
  expect(mocks.exchange).not.toHaveBeenCalled();
  mocks.exchange.mockRejectedValue(Error("private-code-details"));
  const failed = await GET(
    new NextRequest("https://servqo.example/auth/recovery?code=secret"),
  );
  expect(failed.headers.get("location")).toContain("/forgot-password");
  expect(failed.headers.get("location")).not.toContain("secret");
});
