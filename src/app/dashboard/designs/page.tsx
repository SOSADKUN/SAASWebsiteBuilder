import { redirect } from "next/navigation";
import { dashboardData } from "@/server/queries";
import { Dashboard } from "@/components/dashboard/dashboard";
export const dynamic = "force-dynamic";
export default async function DesignsPage() {
  const data = await dashboardData();
  if (!data) redirect("/dashboard");
  return <Dashboard data={data} initialTab="Design Gallery" />;
}
