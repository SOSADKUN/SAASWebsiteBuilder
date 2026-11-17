import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { Brand } from "../src/components/brand";
import { ServqoLoading } from "../src/components/servqo-loading";
import manifest from "../src/app/manifest";
it("uses SERVQOO while retaining existing icon paths and PWA entry route", () => {
  const brand = renderToStaticMarkup(<Brand />),
    loading = renderToStaticMarkup(<ServqoLoading />);
  expect(brand).toContain("SERVQOO");
  expect(brand).toContain("/brand/servqo-icon.webp");
  expect(loading).toContain("SERVQOO");
  expect(manifest()).toMatchObject({
    name: "SERVQOO",
    short_name: "SERVQOO",
    start_url: "/dashboard",
  });
});
