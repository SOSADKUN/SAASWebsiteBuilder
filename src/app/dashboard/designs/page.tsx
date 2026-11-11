import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
export const dynamic = "force-dynamic";
export default async function DesignsPage() {
  return (
    <DashboardScreen
      requiredCapability="website:manage"
      initialTab="Design Gallery"
    />
  );
}
