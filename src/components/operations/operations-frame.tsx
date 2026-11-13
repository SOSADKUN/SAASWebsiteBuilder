"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import { SyncStatus } from "./sync-status";
import type { useOperations } from "./use-operations";

export function OperationsFrame({
  title,
  className,
  sync,
  children,
}: {
  title: string;
  className: string;
  sync: ReturnType<typeof useOperations>;
  children: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === root.current);
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.fullscreenElement &&
        !root.current?.querySelector("dialog[open]")
      )
        setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);
  async function toggle() {
    if (fullscreen) {
      if (document.fullscreenElement === root.current) {
        try {
          await document.exitFullscreen();
        } catch {
          return;
        }
      }
      setFullscreen(false);
    } else {
      try {
        await root.current?.requestFullscreen();
      } catch {
        // Some mobile browsers do not support the Fullscreen API. The fixed
        // workspace still hides the application shell and keeps an exit button.
      }
      setFullscreen(true);
    }
  }
  return (
    <section
      ref={root}
      className={`operations ${className}${fullscreen ? " operations--fullscreen" : ""}`}
    >
      <div className="ops-heading">
        <h1>{title}</h1>
        <div className="ops-heading-actions">
          <SyncStatus sync={sync} />
          <button
            type="button"
            className={`button compact ops-fullscreen${fullscreen ? " ops-danger" : ""}`}
            onClick={() => void toggle()}
            aria-pressed={fullscreen}
          >
            {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            {fullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}
