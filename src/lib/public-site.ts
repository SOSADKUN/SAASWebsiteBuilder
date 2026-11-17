import type { Metadata } from "next";
import { z } from "zod";
export function publicOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  const raw = env.SERVQOO_PUBLIC_ORIGIN || env.NEXT_PUBLIC_APP_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash
    )
      return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}
export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const origin = publicOrigin();
  const index = !!origin && process.env.VERCEL_ENV !== "preview";
  return {
    title: `${title} | SERVQOO`,
    metadataBase: origin ? new URL(origin) : undefined,
    description,
    alternates: origin ? { canonical: origin + path } : undefined,
    robots: { index, follow: index },
    openGraph: {
      title: `${title} | SERVQOO`,
      description,
      type: "website",
      ...(origin ? { url: origin + path } : {}),
      images: origin
        ? [{ url: origin + "/brand/servqo-icon.webp", alt: "SERVQOO" }]
        : undefined,
    },
  };
}
export function publicContacts(
  env: Record<string, string | undefined> = process.env,
) {
  const email = z.email().max(254).safeParse(env.SERVQOO_CONTACT_EMAIL);
  const phone = env.SERVQOO_WHATSAPP_NUMBER;
  return {
    email: email.success ? email.data : null,
    whatsapp:
      phone && /^[1-9][0-9]{7,14}$/.test(phone)
        ? `https://wa.me/${phone}`
        : null,
  };
}
export const publicPaths = [
  "/",
  "/pricing",
  "/purchase",
  "/demo",
  "/contact",
  "/legal/terms",
  "/legal/privacy",
  "/legal/subscription",
  "/legal/cancellation",
  "/legal/discontinuation",
];

// Opt-in redirects cover marketing routes only. Auth/API/tenant URLs stay untouched.
export function marketingRedirects(
  env: Record<string, string | undefined> = process.env,
) {
  const origin = publicOrigin(env);
  if (!origin) return [];
  const current = new URL(origin).hostname;
  const hosts = [
    ...new Set(
      (env.SERVQOO_REDIRECT_FROM_HOSTS ?? "")
        .split(",")
        .map((h) => h.trim().toLowerCase()),
    ),
  ].filter(
    (h) =>
      h !== current &&
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h),
  );
  return hosts.flatMap((host) =>
    publicPaths.map((path) => ({
      source: path,
      has: [
        { type: "host" as const, value: host.replaceAll(".", String.raw`\.`) },
      ],
      destination: origin + path,
      permanent: true,
    })),
  );
}
