import { PublicShell } from "@/components/marketing/public-shell";
import { Landing } from "@/components/marketing/landing";
import { publicMetadata } from "@/lib/public-site";
export const metadata = publicMetadata(
  "Your website. Your daily work.",
  "A modular small-business workspace. Permanent Free Core, one company website and 14-day trials for implemented System Services. No card required.",
  "/",
);
export default function Home() {
  return (
    <PublicShell>
      <Landing />
    </PublicShell>
  );
}
