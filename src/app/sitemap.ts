import type { MetadataRoute } from "next";
import { publicOrigin, publicPaths } from "@/lib/public-site";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin || process.env.VERCEL_ENV === "preview") return [];
  return publicPaths
    .filter((path) => !path.startsWith("/legal") && path !== "/purchase")
    .map((path) => ({
      url: origin + path,
      changeFrequency: path.startsWith("/legal") ? "monthly" : "weekly",
      priority: path === "/" ? 1 : path === "/pricing" ? 0.9 : 0.5,
    }));
}
