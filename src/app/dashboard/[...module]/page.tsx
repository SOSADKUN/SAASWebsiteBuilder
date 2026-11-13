import { notFound, redirect } from "next/navigation";
import { navigationForPath } from "@/lib/dashboard-navigation";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
export const dynamic = "force-dynamic";
// Only implemented entries resolve. Future modules can replace individual
// branches with their own route layouts/loaders without changing public URLs.
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string[] }>;
}) {
  const { module } = await params;
  if (module.join("/") === "maintenance/categories")
    redirect("/dashboard/maintenance/menu");
  const item = navigationForPath(`/dashboard/${module.join("/")}`);
  if (!item?.view || item.comingSoon) notFound();
  return (
    <DashboardScreen
      requiredCapability={item.requires}
      initialTab={item.view}
    />
  );
}
