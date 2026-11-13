"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getApplicationOrigin } from "@/lib/auth-redirect";
export async function requestPasswordReset(form: FormData) {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success)
    redirect("/forgot-password?error=Enter+a+valid+email+address.");
  let failed = false;
  try {
    const client = await supabase();
    const { error } = await client.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${getApplicationOrigin()}/auth/recovery`,
    });
    failed = !!error;
  } catch {
    failed = true;
  }
  // The response never confirms whether an account exists.
  redirect(
    failed
      ? "/forgot-password?error=Unable+to+send+a+reset+link.+Please+try+again."
      : "/forgot-password?message=If+an+account+exists+for+that+email,+a+reset+link+is+on+its+way.+Open+it+in+this+browser.",
  );
}
export async function updatePassword(form: FormData) {
  const value = z
    .object({ password: z.string().min(8), confirm: z.string() })
    .refine((v) => v.password === v.confirm)
    .safeParse({
      password: form.get("password"),
      confirm: form.get("confirm"),
    });
  if (!value.success)
    redirect(
      "/reset-password?error=Use+at+least+8+characters+and+matching+passwords.",
    );
  let outcome: "invalid" | "failed" | "success" = "failed";
  try {
    const client = await supabase();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) outcome = "invalid";
    else {
      const { error } = await client.auth.updateUser({
        password: value.data.password,
      });
      if (!error) {
        outcome = "success";
        try {
          await client.auth.signOut({ scope: "local" });
        } catch {
          /* Password is already updated. */
        }
      }
    }
  } catch {
    /* Return a safe error without provider/session details. */
  }
  if (outcome === "invalid")
    redirect("/forgot-password?error=Request+a+new+password+reset+link.");
  if (outcome !== "success")
    redirect(
      "/reset-password?error=Unable+to+update+your+password.+Try+a+different+password+or+request+a+new+link.",
    );
  redirect("/login?message=Password+updated.+Sign+in+with+your+new+password.");
}
