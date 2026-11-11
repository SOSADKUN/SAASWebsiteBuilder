type PublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};
function environment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
export function hasSupabaseConfiguration(
  env: PublicEnvironment = environment(),
) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
    (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
export function getSupabaseConfiguration(
  env: PublicEnvironment = environment(),
) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid project URL.");
  }
  if (
    parsed.username ||
    parsed.password ||
    !(
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
    )
  )
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS, except for local Supabase.",
    );
  let privileged = key.startsWith("sb_secret_");
  // Reject a legacy service-role JWT before it can be used as a public key.
  try {
    const payload = key.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(
        atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
      );
      privileged ||= decoded.role === "service_role";
    }
  } catch {
    /* Key validation is ultimately performed by Supabase. */
  }
  if (privileged)
    throw new Error(
      "Supabase authentication requires a publishable or anon key, never a secret/service-role key.",
    );
  return { url: parsed.origin, key };
}
