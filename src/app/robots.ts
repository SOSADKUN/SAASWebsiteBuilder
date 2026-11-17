import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/public-site";
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  if (!origin || process.env.VERCEL_ENV === "preview")
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api/",
        "/auth/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: origin + "/sitemap.xml",
  };
}
