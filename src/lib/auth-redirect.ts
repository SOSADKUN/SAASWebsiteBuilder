export function getApplicationOrigin(
  env: {
    NEXT_PUBLIC_APP_URL?: string;
    VERCEL_URL?: string;
    NODE_ENV?: string;
  } = process.env,
) {
  const configured =
    env.NEXT_PUBLIC_APP_URL ||
    (env.VERCEL_URL
      ? `https://${env.VERCEL_URL}`
      : env.NODE_ENV !== "production"
        ? "http://localhost:3000"
        : undefined);
  if (!configured)
    throw new Error("Set NEXT_PUBLIC_APP_URL to the deployed HTTPS origin.");
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid application origin.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" && local && env.NODE_ENV !== "production")
    )
  )
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an HTTPS origin without a path; local HTTP is allowed only in development.",
    );
  return url.origin;
}
export function safeAuthDestination(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return "/dashboard";
  return value;
}
