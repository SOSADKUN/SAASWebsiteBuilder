"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
export function CheckEmailNotice({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // Start with visible server-rendered content; upgrade to a focus-trapped
    // native modal after hydration, without requiring JavaScript to read it.
    element.close();
    element.showModal();
  }, []);
  return (
    <div className="servqo-email-backdrop">
      <dialog
        open
        ref={dialog}
        className="servqo-email-dialog"
        aria-labelledby="result-title"
        onCancel={(event) => {
          event.preventDefault();
          router.push("/login");
        }}
      >
        {children}
      </dialog>
    </div>
  );
}
