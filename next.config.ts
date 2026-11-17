import type { NextConfig } from "next";
import { marketingRedirects } from "./src/lib/public-site";
const config: NextConfig = {
  async redirects() {
    return marketingRedirects();
  },
  experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
};
export default config;
