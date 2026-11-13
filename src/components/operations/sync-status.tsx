"use client";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { useOperations } from "./use-operations";
export function SyncStatus({
  sync,
}: {
  sync: ReturnType<typeof useOperations>;
}) {
  return (
    <div className="ops-sync-wrap">
      <div className={`ops-sync ${sync.status}`} role="status">
        {sync.status === "live" ? <Wifi size={15} /> : <WifiOff size={15} />}
        <span>
          {sync.status === "live"
            ? sync.autoPoll
              ? "Live - updates every few seconds"
              : "Connected - scroll to tickets for updates"
            : sync.status === "connecting"
              ? "Connecting…"
              : sync.status === "paused"
                ? "Updates paused while hidden"
                : sync.status === "offline"
                  ? "Offline · showing last synced data"
                  : "Sync interrupted · retrying"}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Refresh orders"
          onClick={sync.refresh}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {sync.error && (
        <p className="ops-sync-error" role="alert">
          {sync.error}
        </p>
      )}
    </div>
  );
}
