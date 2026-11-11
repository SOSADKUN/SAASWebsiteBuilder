import { MerchantWorkspaceProvider } from "@/components/dashboard/workspace-state";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantWorkspaceProvider>{children}</MerchantWorkspaceProvider>;
}
