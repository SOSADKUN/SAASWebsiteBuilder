import { unstable_rethrow } from "next/navigation";
import { Brand } from "@/components/brand";
import { dashboardData } from "@/server/queries";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { dashboardErrorMessage } from "@/lib/workspace-errors";
import type { MerchantCapability } from "@/lib/merchant-capabilities";
import { Dashboard } from "./dashboard";
import { WorkspaceOnboarding } from "./workspace-onboarding";
import { publicContacts } from "@/lib/public-site";

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
    data = await dashboardData(
      requiredCapability,
      trace,
      initialTab ?? "Overview",
    );
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
  if (
    data?.business.onboardingStep &&
    data.business.onboardingStep !== "complete"
  ) {
    if (!data.navigationCapabilities.includes("modules:manage"))
      return (
        <main className="servqo-result-page">
          <Brand />
          <section className="servqo-result-card">
            <h1>Business setup is in progress</h1>
            <p>Ask the owner to finish setting up this workspace.</p>
          </section>
        </main>
      );
    return (
      <WorkspaceOnboarding
        key={data.business.id + data.business.onboardingStep}
        setup={{
          merchantId: data.business.id,
          name: data.business.name,
          slug: data.business.slug,
          ownerName: data.ownerName,
          type: data.businessType,
          step: data.business.onboardingStep,
          selected: data.business.onboardingServices,
          modules: data.modules,
          subscription: data.subscription,
        }}
      />
    );
  }
  return data ? (
    <Dashboard
      key={initialTab ?? "Overview"}
      data={data}
      initialTab={initialTab}
      supportContacts={publicContacts()}
    />
  ) : (
    <WorkspaceOnboarding />
  );
}
