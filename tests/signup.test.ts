import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/subscription-service", () => ({ requireSubscription: vi.fn() }));
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  supabase: mocks.supabase,
  user: vi.fn(),
  authorize: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/db", () => ({ db: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { signUp, signIn } from "../src/server/actions";
function form(email = "owner@example.com", password = "test-password") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://servqo.example");
  mocks.supabase.mockResolvedValue({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  });
});
describe("Supabase sign-up flow", () => {
  it("keeps successful password sign-in redirecting to the protected dashboard", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn(form())).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "test-password",
    });
  });
  it("keeps failed password sign-in on login without logging credentials", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      mocks.signInWithPassword.mockResolvedValue({
        error: {
          code: "invalid_credentials",
          message: "private-provider-message",
        },
      });
      await expect(signIn(form())).rejects.toThrow(
        "REDIRECT:/login?error=Unable+to+sign+in",
      );
      const output = JSON.stringify(log.mock.calls);
      expect(output).toContain("auth.signin");
      expect(output).not.toContain("owner@example.com");
      expect(output).not.toContain("test-password");
      expect(output).not.toContain("private-provider-message");
    } finally {
      log.mockRestore();
    }
  });
  it("registers through Supabase with the existing confirmation callback", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    await expect(signUp(form())).rejects.toThrow(
      "REDIRECT:/signup/check-email",
    );
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "test-password",
      options: { emailRedirectTo: "https://servqo.example/auth/confirm" },
    });
  });
  it("returns registration failures to the sign-up page", async () => {
    mocks.signUp.mockResolvedValue({
      error: { message: "Registration failed" },
    });
    await expect(signUp(form())).rejects.toThrow(
      "REDIRECT:/signup?error=Unable+to+register",
    );
  });
  it("rejects invalid input before contacting Supabase", async () => {
    for (const data of [form("invalid"), form("owner@example.com", "short")])
      await expect(signUp(data)).rejects.toThrow(
        "REDIRECT:/signup?error=Enter+a+valid+email",
      );
    expect(mocks.supabase).not.toHaveBeenCalled();
  });
  it.each([
    [
      "over_email_send_rate_limit",
      "Deleting an account does not reset the email limit",
    ],
    [
      "email_address_not_authorized",
      "current email service cannot send confirmation",
    ],
    ["weak_password", "password does not meet"],
    ["signup_disabled", "registration is currently disabled"],
  ])("explains %s without exposing provider details", async (code, message) => {
    mocks.signUp.mockResolvedValue({
      error: { code, message: "private-provider-detail" },
    });
    try {
      await signUp(form());
    } catch (error) {
      const result = decodeURIComponent(String(error)).replaceAll("+", " ");
      expect(result).toContain(message);
      expect(result).not.toContain("private-provider-detail");
      return;
    }
    throw new Error("Expected a registration error redirect");
  });
});
