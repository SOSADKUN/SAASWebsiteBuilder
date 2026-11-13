"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OperationsSnapshot } from "@/lib/order-policy";
export function useOperations(
  merchantId: string,
  withMenu = false,
  autoPoll = true,
) {
  const [data, setData] = useState<OperationsSnapshot>({ orders: [] });
  const [status, setStatus] = useState<
    "connecting" | "live" | "offline" | "error" | "paused"
  >("connecting");
  const [error, setError] = useState("");
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const autoPollRef = useRef(autoPoll);
  useEffect(() => {
    autoPollRef.current = autoPoll;
    if (autoPoll) refreshRef.current();
  }, [autoPoll]);
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    let stopped = false,
      inFlight = false,
      queued = false;
    let controller: AbortController | undefined;
    const poll = async () => {
      await Promise.resolve();
      if (stopped) return;
      if (document.hidden) {
        setStatus("paused");
        return;
      }
      if (!navigator.onLine) {
        setStatus("offline");
        setError(
          "This device is offline. Keep this screen open; orders will sync when the connection returns.",
        );
        return;
      }
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12000);
      try {
        const response = await fetch(
          `/api/orders?merchantId=${encodeURIComponent(merchantId)}${withMenu ? "&menu=1" : ""}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        if (stopped) return;
        if (response.redirected)
          throw Error(
            "Your session expired. Sign in again to resume live updates.",
          );
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Orders could not sync.");
        setData(body);
        setStatus("live");
        setError("");
        setLastSynced(Date.now());
      } catch (error) {
        if (!stopped) {
          setStatus(navigator.onLine ? "error" : "offline");
          setError(
            error instanceof Error && error.name !== "AbortError"
              ? error.message
              : "Orders could not sync. Retrying automatically; the displayed tickets may be out of date.",
          );
        }
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (queued && !stopped) {
          queued = false;
          void poll();
        }
      }
    };
    refreshRef.current = () => {
      void poll();
    };
    void poll();
    const timer = window.setInterval(() => {
      if (autoPollRef.current) void poll();
    }, 3000);
    const reconnect = () => {
      // Online/offline changes always update connection safety. Background
      // polling and focus refresh can wait until POS tickets are in view.
      void poll();
    };
    const focus = () => {
      if (autoPollRef.current) void poll();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      refreshRef.current = () => {};
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [merchantId, withMenu]);
  return { data, status, error, lastSynced, refresh, autoPoll };
}
