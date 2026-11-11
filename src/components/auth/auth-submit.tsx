"use client";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
export function AuthSubmit({
  disabled,
  label = "Sign in to your workspace",
}: {
  disabled: boolean;
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="servqo-signin"
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          Please wait <LoaderCircle size={18} />
        </>
      ) : (
        <>
          {label} <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
