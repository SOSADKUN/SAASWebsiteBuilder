import { unstable_rethrow } from "next/navigation";
import { Brand } from "@/components/brand";
import { dashboardData } from "@/server/queries";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { dashboardErrorMessage } from "@/lib/workspace-errors";
import type { MerchantCapability } from "@/lib/merchant-capabilities";
import { Dashboard } from "./dashboard";
import { WorkspaceOnboarding } from "./workspace-onboarding";

export async function DashboardScreen({
  requiredCapability,
  initialTab,
}: {
  requiredCapability?: MerchantCapability;
  initialTab?: string;
}) {
  const trace = workspaceTrace("dashboard.load");
  let data;
  try {
    data = await dashboardData(requiredCapability, trace);
  } catch (error) {
    // Preserve Next authentication redirects and other framework control flow.
    unstable_rethrow(error);
    return (
      <main className="servqo-result-page">
        <Brand />
        <section className="servqo-result-card" role="alert">
          <h1>Unable to load your workspace</h1>
          <p>{dashboardErrorMessage(error)}</p>
          <p className="workspace-reference">
            Support reference: {trace.reference}
          </p>
          <form action="/dashboard" method="get">
            <button className="button primary" type="submit">
              Try again
            </button>
          </form>
        </section>
      </main>
    );
  }
  return data ? (
    <Dashboard data={data} initialTab={initialTab} />
  ) : (
    <WorkspaceOnboarding />
  );
}
