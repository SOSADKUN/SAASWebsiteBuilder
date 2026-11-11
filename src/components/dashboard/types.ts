import type { dashboardData } from "@/server/queries";
export type DashboardData = NonNullable<
  Awaited<ReturnType<typeof dashboardData>>
>;
