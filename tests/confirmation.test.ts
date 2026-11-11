import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  supabase: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ supabase: mocks.supabase }));
import { GET } from "../src/app/auth/confirm/route";
import Confirmed from "../src/app/auth/confirmed/page";
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
  it("verifies the token and sends users to the activation page without leaking it", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const response = await GET(
      new NextRequest(
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
  it("handles expired or missing tokens without showing success", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    for (const query of ["?token_hash=test&type=email", ""]) {
      const response = await GET(
        new NextRequest(`http://localhost:3000/auth/confirm${query}`),
      );
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/auth/confirmed?status=invalid",
      );
    }
  });
  it("handles provider connection failures without exposing errors", async () => {
    mocks.supabase.mockRejectedValue(new Error("private configuration"));
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?code=test"),
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
