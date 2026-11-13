"use client";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
export function PasswordField({
  signup = false,
  name = "password",
  label = "Password",
}: {
  signup?: boolean;
  name?: string;
  label?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <label htmlFor={name}>
      {label}
      <span className="auth-input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id={name}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={
            signup ? "Create a password (8+ characters)" : "Enter your password"
          }
          minLength={8}
          required
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
        >
          {shown ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </span>
    </label>
  );
}
