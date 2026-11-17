import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactServqoo } from "../src/components/dashboard/contact-servqoo";
import { publicContacts } from "../src/lib/public-site";
import {
  navigationForPath,
  groupForView,
} from "../src/lib/dashboard-navigation";

it("provides a Settings contact route with existing permissions", () => {
  expect(navigationForPath("/dashboard/settings/contact")).toMatchObject({
    view: "Contact SERVQOO",
    requires: "settings:view",
    moduleKey: "settings",
  });
  expect(groupForView("Contact SERVQOO")?.id).toBe("settings");
});
it("opens configured email and WhatsApp destinations", () => {
  const html = renderToStaticMarkup(
    <ContactServqoo
      contacts={publicContacts({
        SERVQOO_CONTACT_EMAIL: "support@example.com",
        SERVQOO_WHATSAPP_NUMBER: "60123456789",
      })}
    />,
  );
  expect(html).toContain('href="mailto:support@example.com"');
  expect(html).toContain(
    `href="https://wa.me/60123456789?text=${encodeURIComponent("Hi SERVQOO, I would like to know more about your services.")}"`,
  );
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
});
it("disables unavailable channels without inventing contact details", () => {
  const html = renderToStaticMarkup(
    <ContactServqoo contacts={publicContacts({})} />,
  );
  expect(html.match(/disabled=""/g)).toHaveLength(1);
  expect(html).not.toContain("WhatsApp");
  expect(html).not.toContain("href=");
});
it.each([
  undefined,
  "",
  "+60123456789",
  "60 123456789",
  "60-123456789",
  "60",
  "0123456789",
])("hides an invalid WhatsApp number while preserving email (%s)", (number) => {
  const html = renderToStaticMarkup(
    <ContactServqoo
      contacts={publicContacts({
        SERVQOO_CONTACT_EMAIL: "support@example.com",
        SERVQOO_WHATSAPP_NUMBER: number,
      })}
    />,
  );
  expect(html).not.toContain("WhatsApp");
  expect(html).toContain('href="mailto:support@example.com"');
});
