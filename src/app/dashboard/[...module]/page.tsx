import { notFound, redirect } from "next/navigation";
import { navigationForPath } from "@/lib/dashboard-navigation";
import { dashboardData } from "@/server/queries";
import { Dashboard } from "@/components/dashboard/dashboard";
export const dynamic = "force-dynamic";
// Only implemented entries resolve. Future modules can replace individual
// branches with their own route layouts/loaders without changing public URLs.
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string[] }>;
}) {
  const { module } = await params;
  const item = navigationForPath(`/dashboard/${module.join("/")}`);
  if (!item?.view || item.comingSoon) notFound();
  const data = await dashboardData(item.requires);
  if (!data) redirect("/dashboard");
  return <Dashboard data={data} initialTab={item.view} />;
}
