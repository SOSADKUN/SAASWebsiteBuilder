"use client";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
export function AuthSubmit({ disabled }: { disabled: boolean }) {
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
          Sign in to your workspace <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
