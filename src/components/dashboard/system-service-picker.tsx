"use client";
import { useState } from "react";
import {
  Monitor,
  ClipboardList,
  CalendarDays,
  CakeSlice,
  Users,
  Boxes,
  Globe,
  Image as ImageIcon,
  ShoppingBag,
  LockKeyhole,
  Check,
} from "lucide-react";
import {
  systemServices,
  addService,
  selectionError,
  formatServicePrice,
} from "@/lib/system-services";
import {
  moduleAccess,
  type BusinessType,
  type ModuleState,
} from "@/lib/business-modules";
const icons = {
  pos: Monitor,
  orders: ClipboardList,
  appointments: CalendarDays,
  cake_preorders: CakeSlice,
  staff_availability: Users,
  inventory: Boxes,
  website: Globe,
  media: ImageIcon,
  catalog: ShoppingBag,
};
export function SystemServicePicker({
  type,
  selected,
  modules,
  disabled = false,
  management = false,
  onChange,
  onToggle,
}: {
  type: BusinessType;
  selected: readonly string[];
  modules?: readonly ModuleState[];
  disabled?: boolean;
  management?: boolean;
  onChange?: (keys: string[]) => void;
  onToggle?: (key: string, enabled: boolean) => void;
}) {
  const [all, setAll] = useState(false),
    [message, setMessage] = useState("");
  function toggle(key: string, checked: boolean) {
    if (onToggle) {
      onToggle(key, checked);
      return;
    }
    const next = checked
      ? addService(selected, key)
      : selected.filter((k) => k !== key);
    const error = selectionError(next, type);
    if (error) {
      setMessage(error);
      return;
    }
    const added = next.filter((k) => k !== key && !selected.includes(k));
    setMessage(
      added.length
        ? `Also selected: ${added.map((k) => systemServices.find((s) => s.key === k)?.name).join(", ")}.`
        : "",
    );
    onChange?.(next);
  }
  return (
    <div className="system-service-picker">
      <p>
        Permanent Free Core includes your dashboard, business profile, product
        catalog, media within quota and one multi-page website. Select optional
        System Services below.
      </p>
      <div className="services-filter">
        <p>Recommended for your business. Choose the services you need.</p>
        <button
          className="button compact"
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? "Recommended services" : "View all System Services"}
        </button>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="service-card-grid">
        {systemServices
          .filter(
            (s) =>
              all ||
              (s.featured && s.suggestedTypes.includes(type)) ||
              selected.includes(s.key),
          )
          .map((service) => {
            const checked = selected.includes(service.key),
              compatible = service.compatibleTypes.includes(type);
            const licensed =
              !modules ||
              service.modules.every((key) => {
                const state = modules.find((m) => m.key === key);
                return (
                  state?.entitled &&
                  state.available !== false &&
                  (!state.expiresAt || Date.parse(state.expiresAt) > Date.now())
                );
              });
            const Icon = icons[service.key as keyof typeof icons] ?? Boxes;
            const state = !service.implemented
              ? "Coming soon"
              : !licensed
                ? "License required / expired"
                : management
                  ? service.modules.every(
                      (key) => moduleAccess(key, modules ?? []) === "enabled",
                    )
                    ? "Enabled"
                    : "Disabled"
                  : checked
                    ? "Selected"
                    : "Available";
            return (
              <label
                className={`service-card ${checked ? "selected" : ""} ${!service.implemented ? "planned" : ""}`}
                key={service.key}
              >
                <div className="service-card-top">
                  <span className="service-icon">
                    <Icon size={22} />
                  </span>
                  <input
                    type="checkbox"
                    aria-label={service.name}
                    checked={checked}
                    disabled={
                      disabled ||
                      !service.implemented ||
                      !compatible ||
                      (!checked && !licensed)
                    }
                    onChange={(event) =>
                      toggle(service.key, event.target.checked)
                    }
                  />
                </div>
                <span className="service-status">
                  {!service.implemented ? (
                    <LockKeyhole size={12} />
                  ) : checked ? (
                    <Check size={12} />
                  ) : null}
                  {state}
                  {service.suggestedTypes.includes(type)
                    ? " · Recommended"
                    : ""}
                </span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-price">
                  {service.monthlyPrice === null ? (
                    "Pricing to be announced"
                  ) : service.monthlyPrice === 0 ? (
                    "Included"
                  ) : (
                    <>
                      {formatServicePrice(service.monthlyPrice)}
                      <small>/month</small>
                    </>
                  )}
                </div>
                <small>
                  {service.implemented
                    ? service.monthlyPrice === 0
                      ? "Permanently included in Free Core"
                      : "14-day trial eligible · Demo price"
                    : "Not available to activate"}
                </small>
                {service.dependencies.length > 0 && (
                  <small className="service-dependencies">
                    Requires{" "}
                    {service.dependencies
                      .map(
                        (key) =>
                          systemServices.find((s) => s.key === key)?.name ??
                          key,
                      )
                      .join(", ")}
                  </small>
                )}
              </label>
            );
          })}
      </div>
    </div>
  );
}
