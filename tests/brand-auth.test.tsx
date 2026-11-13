import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
vi.mock("@/server/actions", () => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock("@/server/password-actions", () => ({
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock("@/lib/supabase-config", () => ({
  hasSupabaseConfiguration: () => true,
}));
import { Brand } from "../src/components/brand";
import { ServqoLoading } from "../src/components/servqo-loading";
import { AuthPage } from "../src/components/auth/auth-page";
it("uses the supplied logo image and an accessible, non-spinner loading state", () => {
  const brand = renderToStaticMarkup(<Brand />);
  expect(brand).toContain("/brand/servqo-icon.webp");
  expect(brand).not.toContain("<svg");
  const loading = renderToStaticMarkup(<ServqoLoading />);
  expect(loading).toContain('role="status"');
  expect(loading).toContain('aria-busy="true"');
  expect(loading).toContain("Getting your workspace ready");
});
it("renders functional email/password fields, recovery navigation and minimal copy", () => {
  const html = renderToStaticMarkup(<AuthPage mode="login" params={{}} />);
  expect(html).toContain('name="email"');
  expect(html).toContain('name="password"');
  expect(html).toContain('type="password"');
  expect(html).toContain('type="button"');
  expect(html).toContain('href="/forgot-password"');
  expect(html).toContain('href="/signup"');
  expect(html).not.toContain('type="checkbox"');
  expect(html).not.toContain("LESS ADMIN");
});
it("has reduced-motion overrides for all new animation", async () => {
  const css = await readFile("src/app/servqo-login.css", "utf8");
  expect(css).toContain("prefers-reduced-motion");
  expect(css).toContain("animation: none");
});
