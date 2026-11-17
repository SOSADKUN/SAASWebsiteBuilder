"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  businessTypes,
  type BusinessType,
  type ModuleState,
} from "@/lib/business-modules";
import {
  selectedServices,
  estimatedMonthly,
  formatServicePrice,
  addService,
  systemServices,
} from "@/lib/system-services";
import {
  configureSystemService,
  setBusinessType,
} from "@/server/module-actions";
import { SystemServicePicker } from "./system-service-picker";
function DisableConfirmation({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="media-delete-dialog service-confirm-dialog"
      aria-labelledby="disable-service-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id="disable-service-title">Disable {name}?</h2>
      <p>
        This service contains business records. Its screens will be hidden and
        new operations will stop. Your records will stay saved for reactivation
        and export.
      </p>
      <div>
        <button className="button" disabled={pending} onClick={onCancel}>
          Keep service
        </button>
        <button
          className="button primary"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Updating..." : "Disable service"}
        </button>
      </div>
    </dialog>
  );
}
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
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = selectedServices(modules);
  function toggle(key: string, enabled: boolean, confirmed = false) {
    startTransition(async () => {
      setMessage("");
      try {
        const result = await configureSystemService(
          merchantId,
          key,
          enabled,
          confirmed,
        );
        if (!result.ok) {
          if (result.confirmationRequired) setConfirmation(key);
          else {
            setConfirmation(null);
            setMessage(`${result.error} Reference: ${result.reference}`);
          }
          return;
        }
        setConfirmation(null);
        const next = enabled
          ? addService(selected, key)
          : selected.filter((k) => k !== key);
        setMessage(
          `Services updated. Projected monthly services: ${formatServicePrice(estimatedMonthly(next))}. No payment was collected.`,
        );
        router.refresh();
      } catch {
        setMessage(
          "Could not confirm the update. Reload to check your saved services.",
        );
      }
    });
  }
  return (
    <section className="module-store" aria-busy={pending}>
      <div className="page-heading">
        <div>
          <h1>System Services</h1>
          <p>
            Add the tools you need. Your saved records stay yours when a service
            is disabled.
          </p>
        </div>
      </div>
      <div className="services-management-summary">
        <div>
          <small>ESTIMATED MONTHLY SERVICES</small>
          <strong>
            {formatServicePrice(estimatedMonthly(selected))}
            <small>/month</small>
          </strong>
          <p>
            Demo pricing. No automatic charges or real subscription purchase.
          </p>
        </div>
        <label>
          Business type
          <select
            value={type}
            disabled={!canConfigure || !canWrite || pending}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(async () => {
                try {
                  const result = await setBusinessType(merchantId, value);
                  setMessage(
                    result.ok
                      ? "Recommendations updated. Your services and trial dates have not changed."
                      : result.error,
                  );
                  if (result.ok) router.refresh();
                } catch {
                  setMessage("Business type could not be updated.");
                }
              });
            }}
          >
            {Object.entries(businessTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <small>Changes recommendations, not your enabled services.</small>
        </label>
      </div>
      <p className="notice">
        Free Core includes your Dashboard, business profile, catalog, media and
        one multi-page website. Paid services require their own active trial or
        verified entitlement. You can always manage services and export your
        data.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {pending && (
        <p className="notice" role="status">
          Updating services...
        </p>
      )}
      <SystemServicePicker
        type={type}
        selected={selected}
        modules={modules}
        disabled={!canConfigure || pending}
        management
        onToggle={toggle}
      />
      {confirmation && (
        <DisableConfirmation
          name={
            systemServices.find((s) => s.key === confirmation)?.name ??
            "this service"
          }
          pending={pending}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => toggle(confirmation, false, true)}
        />
      )}
    </section>
  );
}
