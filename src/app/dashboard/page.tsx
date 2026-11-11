import { Brand } from "@/components/brand";
import { dashboardData } from "@/server/queries";
import { createBusiness } from "@/server/actions";
import { Dashboard } from "@/components/dashboard/dashboard";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const data = await dashboardData();
  if (!data)
    return (
      <main className="onboarding">
        <Brand className="servqo-onboarding-brand" />
        <h1>Let’s bring your café online.</h1>
        <p>Start with your business name and choose your website address.</p>
        <form action={createBusiness}>
          <label>
            Business name
            <input
              name="name"
              placeholder="Your café name"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Website address
            <input
              name="slug"
              placeholder="your-cafe"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={60}
              required
            />
            <small>/sites/your-cafe-name</small>
          </label>
          <button className="button primary">Create my workspace →</button>
        </form>
      </main>
    );
  return <Dashboard data={data} />;
}
