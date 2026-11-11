import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  supabase: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ supabase: mocks.supabase }));
import { GET, POST } from "../src/app/auth/confirm/route";
import Confirmed from "../src/app/auth/confirmed/page";
function postRequest(value: string) {
  const url = new URL(value);
  return new NextRequest(url.origin + url.pathname, {
    method: "POST",
    body: new URLSearchParams(url.search),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.supabase.mockResolvedValue({
    auth: {
      verifyOtp: mocks.verifyOtp,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
  });
});
describe("email confirmation", () => {
  it("opening an email link never consumes its token", async () => {
    const response = await GET(
      new NextRequest(
        "https://servqo.vercel.app/auth/confirm?token_hash=test&type=email",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://servqo.vercel.app/auth/verify?token_hash=test&type=email",
    );
    expect(mocks.supabase).not.toHaveBeenCalled();
  });
  it("verifies the token and sends users to the activation page without leaking it", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const response = await POST(
      postRequest(
        "http://localhost:3000/auth/confirm?token_hash=test-token&type=email&next=//external.example",
      ),
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "test-token",
      type: "email",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/confirmed?next=%2Fdashboard",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("supports PKCE confirmation codes", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?code=test-code"),
    );
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toContain("/auth/confirmed?next=");
  });
  it("explains failed PKCE session completion without claiming the email is unverified", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { code: "bad_code_verifier" },
    });
    const response = await GET(
      new NextRequest("https://servqo.vercel.app/auth/confirm?code=test-code"),
    );
    expect(response.headers.get("location")).toBe(
      "https://servqo.vercel.app/auth/confirmed?status=signin",
    );
  });
  it("handles expired or missing tokens without showing success", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    for (const query of ["?token_hash=test&type=email", ""]) {
      const response = await POST(
        postRequest(`http://localhost:3000/auth/confirm${query}`),
      );
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/auth/confirmed?status=invalid",
      );
    }
  });
  it("handles provider connection failures without exposing errors", async () => {
    mocks.supabase.mockRejectedValue(new Error("private configuration"));
    const response = await POST(
      postRequest("http://localhost:3000/auth/confirm?code=test"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/confirmed?status=unavailable",
    );
  });
  it("requires a confirmed server-validated user to display success", async () => {
    for (const [user, state] of [
      [null, "invalid"],
      [{ email_confirmed_at: null }, "invalid"],
      [{ email_confirmed_at: "2026-11-11" }, "success"],
    ] as const) {
      mocks.getUser.mockResolvedValue({ data: { user }, error: null });
      const page = await Confirmed({ searchParams: Promise.resolve({}) });
      expect(page.props.state).toBe(state);
    }
  });
});
