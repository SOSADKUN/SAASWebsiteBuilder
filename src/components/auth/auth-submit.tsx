"use client";
import { useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
export function AuthSubmit({
  disabled,
  label = "Sign in to your workspace",
}: {
  disabled: boolean;
  label?: string;
}) {
  const { pending } = useFormStatus();
  const submitting = useRef(false);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);
  return (
    <button
      className="servqo-signin"
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        if (event.currentTarget.form?.checkValidity())
          submitting.current = true;
      }}
    >
      {pending ? (
        <>
          Please wait{" "}
          <span className="auth-button-progress" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </>
      ) : (
        <>
          {label} <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
