import { WorkspaceOnboarding } from "@/components/dashboard/workspace-onboarding";
import { dashboardData } from "@/server/queries";
import { Dashboard } from "@/components/dashboard/dashboard";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const data = await dashboardData();
  if (!data) return <WorkspaceOnboarding />;
  return <Dashboard data={data} />;
}
