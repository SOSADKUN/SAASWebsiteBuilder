"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  businessModules,
  businessTypes,
  moduleAccess,
  type BusinessType,
  type ModuleState,
} from "@/lib/business-modules";
import { configureModule, setBusinessType } from "@/server/module-actions";

export function ModuleStore({
  merchantId,
  type,
  modules,
  canConfigure,
  canWrite,
}: {
  merchantId: string;
  type: BusinessType;
  modules: readonly ModuleState[];
  canConfigure: boolean;
  canWrite: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(
    action: () => Promise<{ ok: boolean; error?: string; reference?: string }>,
  ) {
    startTransition(async () => {
      setMessage("");
      try {
        const result = await action();
        setMessage(
          result.ok
            ? "Settings updated."
            : `${result.error} Reference: ${result.reference}`,
        );
        if (result.ok) router.refresh();
      } catch {
        setMessage(
          "Could not confirm the update. Reload to check your settings.",
        );
      }
    });
  }
  return (
    <section className="module-store">
      <div className="page-heading">
        <div>
          <h1>Business Modules</h1>
          <p>
            Choose the tools your business uses. Payments are not connected.
          </p>
        </div>
      </div>
      <div className="panel">
        <label>
          Business type
          <select
            value={type}
            disabled={!canConfigure || pending}
            onChange={(event) =>
              run(() => setBusinessType(merchantId, event.target.value))
            }
          >
            {Object.entries(businessTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p>
          Business type changes recommendations only. It does not reset content
          or switch your modules.
        </p>
        <p>
          Website designs are previewed and unlocked in Website Editor. Business
          modules use separate licenses.
        </p>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="admin-grid">
        {businessModules.map((definition) => {
          const status = moduleAccess(definition.key, modules);
          const state = modules.find((m) => m.key === definition.key);
          const available = definition.availability === "implemented";
          return (
            <article className="panel" key={definition.key}>
              <small>
                {definition.category.toUpperCase()}
                {definition.suggestedTypes.includes(type)
                  ? " · Recommended"
                  : ""}
              </small>
              <h2>{definition.name}</h2>
              <p>{definition.description}</p>
              <span className="pill">{status.replaceAll("_", " ")}</span>
              <p>
                {available
                  ? "Included with your SERVQO subscription"
                  : `Coming soon · example RM ${((definition.demoMonthlyPrice ?? 0) / 100).toFixed(2)}/month · demo pricing only`}
              </p>
              {definition.dependencies.length > 0 && (
                <small>
                  Requires:{" "}
                  {definition.dependencies
                    .map(
                      (key) =>
                        businessModules.find((m) => m.key === key)?.name ?? key,
                    )
                    .join(", ")}
                </small>
              )}
              <p>
                <button
                  className="button compact"
                  disabled={
                    !canConfigure ||
                    !canWrite ||
                    pending ||
                    !available ||
                    !definition.optional ||
                    !state?.entitled ||
                    status === "expired" ||
                    status === "not_entitled"
                  }
                  onClick={() =>
                    run(() =>
                      configureModule(
                        merchantId,
                        definition.key,
                        !state?.enabled,
                      ),
                    )
                  }
                >
                  {!available
                    ? "Coming soon"
                    : !definition.optional
                      ? "Core module"
                      : state?.enabled
                        ? "Disable"
                        : "Enable"}
                </button>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
