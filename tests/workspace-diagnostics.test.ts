import { afterEach, describe, it, expect, vi } from "vitest";
import { workspaceTrace } from "../src/lib/workspace-diagnostics";
afterEach(() => vi.restoreAllMocks());
describe("workspace timing diagnostics", () => {
  it("distinguishes onboarding from an existing dashboard without tenant data", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const trace = workspaceTrace("dashboard.load");
    trace.ready("onboarding");
    trace.ready("dashboard");
    const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(entries.map((entry) => entry.stage)).toEqual([
      "onboarding_ready",
      "dashboard_ready",
    ]);
    expect(
      entries.every(
        (entry) =>
          entry.reference === trace.reference && entry.outcome === "completed",
      ),
    ).toBe(true);
  });
  it("identifies expected login redirects without exposing their URLs", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const trace = workspaceTrace("dashboard.load");
    const redirect = {
      digest: "NEXT_REDIRECT;replace;/login?private=value;307;",
    };
    await expect(
      trace.step("authentication", async () => {
        throw redirect;
      }),
    ).rejects.toBe(redirect);
    const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(entries[1]).toMatchObject({
      stage: "authentication",
      outcome: "redirected",
    });
    expect(JSON.stringify(entries)).not.toContain("private=value");
    expect(entries.some((entry) => entry.outcome === "failed")).toBe(false);
  });
  it("records stage timings and a correlation reference without logging results", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const trace = workspaceTrace();
    const secret = { email: "private@example.com", token: "secret-value" };
    expect(await trace.step("authentication", async () => secret)).toBe(secret);
    trace.finish();
    const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(entries.map((entry) => entry.stage)).toEqual([
      "authentication",
      "authentication",
      "ready_to_redirect",
    ]);
    expect(entries.every((entry) => entry.reference === trace.reference)).toBe(
      true,
    );
    expect(entries[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(entries)).not.toContain("private@example.com");
    expect(JSON.stringify(entries)).not.toContain("secret-value");
  });
  it("logs only an allowlisted error code from a failed query", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const trace = workspaceTrace();
    const error = {
      cause: { code: "55P03", message: "private SQL and connection URI" },
    };
    await expect(
      trace.step("merchant", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    trace.fail(error);
    const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(entries[1]).toMatchObject({
      stage: "merchant",
      outcome: "failed",
      errorCode: "55P03",
    });
    expect(JSON.stringify(entries)).not.toContain("private SQL");
  });
});
