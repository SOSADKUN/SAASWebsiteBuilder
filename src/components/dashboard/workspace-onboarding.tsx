"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Coffee,
  CakeSlice,
  Sparkles,
  Scissors,
  Store,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { startBusinessSetup } from "@/server/actions";
import { saveBusinessSetup } from "@/server/onboarding-actions";
import {
  businessTypes,
  type BusinessType,
  type ModuleState,
} from "@/lib/business-modules";
import {
  estimatedMonthly,
  formatServicePrice,
  recommendedServices,
  systemServices,
} from "@/lib/system-services";
import {
  systemTrialAccess,
  type SubscriptionSnapshot,
} from "@/lib/subscription-policy";
import { SystemServicePicker } from "./system-service-picker";
type Setup = {
  merchantId: string;
  name: string;
  slug: string;
  ownerName: string;
  type: BusinessType;
  step: "business_type" | "services" | "review";
  selected: string[];
  modules: ModuleState[];
  subscription: SubscriptionSnapshot;
};
const types = {
  cafe: {
    icon: Coffee,
    description: "Food, drinks and counter pickup orders.",
  },
  bakery: {
    icon: CakeSlice,
    description:
      "Bakery products and retail sales. Cake pre-orders are coming soon.",
  },
  nail_salon: {
    icon: Sparkles,
    description:
      "Showcase your studio. Booking and service checkout are coming soon.",
  },
  hair_salon: {
    icon: Scissors,
    description:
      "Introduce your salon. Appointments and staff schedules are coming soon.",
  },
  beauty_studio: {
    icon: Sparkles,
    description: "Build your online presence. Beauty bookings are coming soon.",
  },
  other: {
    icon: Store,
    description: "Choose your tools for a different or mixed business.",
  },
};
export function WorkspaceOnboarding({ setup }: { setup?: Setup }) {
  const router = useRouter();
  const [step, setStep] = useState(
    setup ? { business_type: 1, services: 2, review: 3 }[setup.step] : 0,
  );
  const [type, setType] = useState<BusinessType>(setup?.type ?? "cafe");
  const [name, setName] = useState(setup?.name ?? ""),
    [slug, setSlug] = useState(setup?.slug ?? ""),
    [ownerName, setOwnerName] = useState(setup?.ownerName ?? "");
  const [selected, setSelected] = useState(
    setup?.selected ?? recommendedServices(type),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const headings = [
    "Create your business",
    "What kind of business do you run?",
    "Choose your System Services",
    "Review your free trial",
  ];
  const access = setup ? systemTrialAccess(setup.subscription) : null;
  function save(
    run: () => Promise<{ ok: boolean; error?: string; reference?: string }>,
    next?: number,
    refresh = true,
  ) {
    startTransition(async () => {
      setError("");
      try {
        const result = await run();
        if (!result.ok) {
          setError(
            `${result.error} ${result.reference ? `Reference: ${result.reference}` : ""}`,
          );
          return;
        }
        if (next !== undefined) setStep(next);
        if (refresh) router.refresh();
      } catch {
        setError(
          "We could not confirm the save. Reload to resume your saved setup; your trial will not restart.",
        );
      }
    });
  }
  function details(form: FormData) {
    if (!setup) save(() => startBusinessSetup(form));
    else
      save(
        () =>
          saveBusinessSetup(setup.merchantId, {
            step: "details",
            ownerName,
            name,
            slug,
          }),
        1,
      );
  }
  function draft(keys: string[]) {
    if (!setup) return;
    startTransition(async () => {
      setError("");
      try {
        const result = await saveBusinessSetup(setup.merchantId, {
          step: "service_draft",
          services: keys,
        });
        if (result.ok) setSelected(keys);
        else setError(result.error);
      } catch {
        setError(
          "Selection was not confirmed. Reload to check your saved choices.",
        );
      }
    });
  }
  return (
    <main className="setup-page">
      <div className="setup-shell">
        <aside className="setup-aside">
          <Brand />
          <div>
            <span className="setup-eyebrow">YOUR BUSINESS, YOUR TOOLS</span>
            <h2>A workspace that fits your business.</h2>
            <p>Start with what you need. Add services when you are ready.</p>
          </div>
          <ol>
            {[
              "Business details",
              "Business type",
              "System Services",
              "Review trial",
            ].map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={
                  index < step ? "done" : step === index ? "current" : ""
                }
              >
                <span>{index < step ? <Check size={16} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <p className="setup-assurance">
            <ShieldCheck size={18} /> No card required. No automatic charges.
          </p>
        </aside>
        <section
          className="setup-content"
          aria-labelledby="workspace-title"
          aria-busy={pending}
        >
          <div className="setup-heading">
            <small>STEP {step + 1} OF 4</small>
            <h1 id="workspace-title">{headings[step]}</h1>
            <p>
              {step === 0
                ? "A few details to set up your private website and workspace."
                : step === 1
                  ? "This recommends services and starter content. You can use tools across business types."
                  : step === 2
                    ? "Select supported services for your trial. You can add more later."
                    : "Check your selection before opening the Dashboard."}
            </p>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {step === 0 && (
            <form action={details} className="setup-details">
              <label>
                Owner / display name
                <input
                  name="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="name"
                  disabled={pending}
                />
              </label>
              <label>
                Business name
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="organization"
                  disabled={pending}
                />
              </label>
              <label>
                Website address
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={60}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={pending}
                />
                <small>
                  /sites/{slug || "your-business"} - Lowercase letters, numbers
                  and single hyphens.
                </small>
              </label>
              <div className="setup-actions">
                <small>
                  Your 14-day trial starts when your business is created.
                </small>
                <button className="button primary" disabled={pending}>
                  {pending ? "Saving business..." : "Continue"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}
          {step === 1 && (
            <>
              <div className="business-type-grid">
                {Object.entries(businessTypes).map(([key, label]) => {
                  const Icon = types[key as BusinessType].icon;
                  return (
                    <label
                      key={key}
                      className={`business-type-card ${type === key ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="businessType"
                        value={key}
                        checked={type === key}
                        onChange={() => setType(key as BusinessType)}
                        disabled={pending}
                      />
                      <Icon size={26} />
                      <b>{label}</b>
                      <span>{types[key as BusinessType].description}</span>
                    </label>
                  );
                })}
              </div>
              <div className="setup-actions">
                <button
                  className="button"
                  disabled={pending}
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="button primary"
                  disabled={pending || !setup}
                  onClick={() =>
                    setup &&
                    save(
                      () =>
                        saveBusinessSetup(setup.merchantId, {
                          step: "business_type",
                          businessType: type,
                        }),
                      2,
                    )
                  }
                >
                  {pending ? "Saving..." : "Continue"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <SystemServicePicker
                type={type}
                selected={selected}
                modules={setup?.modules}
                disabled={pending}
                onChange={draft}
              />
              {pending && <p role="status">Saving selection...</p>}
              <div className="setup-summary">
                <span>Estimated System Services after trial</span>
                <strong>
                  {formatServicePrice(estimatedMonthly(selected))}
                  <small>/month</small>
                </strong>
              </div>
              <p className="setup-fine-print">
                Dashboard, catalog, media and one multi-page website are
                permanently free. Paid service prices are estimates; nothing is
                automatically charged.
              </p>
              <div className="setup-actions">
                <button
                  className="button"
                  disabled={pending}
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="button primary"
                  disabled={pending || !setup}
                  onClick={() =>
                    setup &&
                    save(
                      () =>
                        saveBusinessSetup(setup.merchantId, {
                          step: "services",
                          services: selected,
                        }),
                      3,
                    )
                  }
                >
                  Review trial
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="trial-review">
                <span className="pill">
                  {access?.status === "trialing"
                    ? "14-day free trial"
                    : "Trial ended"}
                </span>
                <h2>
                  {formatServicePrice(0)} <small>due now</small>
                </h2>
                <p>No payment is collected. No card details needed.</p>
                <ul>
                  {selected.length ? (
                    selected.map((key) => {
                      const service = systemServices.find(
                        (s) => s.key === key,
                      )!;
                      return (
                        <li key={key}>
                          <span>{service.name}</span>
                          <b>
                            {formatServicePrice(service.monthlyPrice ?? 0)}
                            /month
                          </b>
                        </li>
                      );
                    })
                  ) : (
                    <li>Core workspace only. Add optional services later.</li>
                  )}
                </ul>
                <div className="setup-summary">
                  <span>Estimated monthly System Services</span>
                  <strong>
                    {formatServicePrice(estimatedMonthly(selected))}
                  </strong>
                </div>
                <p>
                  Trial ends{" "}
                  <b>
                    {setup
                      ? new Date(setup.subscription.trialEndsAt).toLocaleString(
                          "en-MY",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kuala_Lumpur",
                          },
                        )
                      : "when setup is saved"}{" "}
                    MYT
                  </b>
                  {access?.status === "trialing"
                    ? ` - ${access.remainingDays} days remaining`
                    : " - Trial expired; paid services need a verified entitlement. Free Core stays available."}
                </p>
                <p className="setup-fine-print">
                  Estimate only, not an active paid plan. There are no automatic
                  charges. Free Core remains available after the trial. Only new
                  paid-service operations require a verified entitlement. You
                  can return to service selection and choose core only.
                </p>
              </div>
              <div className="setup-actions">
                <button
                  className="button"
                  disabled={pending}
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="button primary"
                  disabled={pending || !setup}
                  onClick={() =>
                    setup &&
                    save(() =>
                      saveBusinessSetup(setup.merchantId, { step: "complete" }),
                    )
                  }
                >
                  {pending ? "Opening workspace..." : "Continue to Dashboard"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
