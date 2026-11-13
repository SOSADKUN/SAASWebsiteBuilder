export class WorkspaceCreationError extends Error {
  constructor() {
    super(
      "This account has already created a trial business. Open your existing workspace or contact support.",
    );
  }
}
export function workspaceErrorCode(error: unknown): string {
  if (error instanceof WorkspaceCreationError) return "TRIAL_CLAIMED";
  const codes = new Set([
    "42P01",
    "42703",
    "42701",
    "23505",
    "23503",
    "23514",
    "42501",
    "57014",
    "55P03",
    "53300",
    "57P01",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "CONNECT_TIMEOUT",
    "CONNECTION_CLOSED",
    "QUERY_TIMEOUT",
    "QUEUE_TIMEOUT",
    "CANCEL_TIMEOUT",
    "CANCEL_UNANSWERED",
  ]);
  let current = error;
  for (
    let depth = 0;
    depth < 5 && current && typeof current === "object";
    depth++
  ) {
    const item = current as { code?: unknown; cause?: unknown };
    if (typeof item.code === "string" && codes.has(item.code)) return item.code;
    current = item.cause;
  }
  return "UNKNOWN";
}
export function dashboardErrorMessage(error: unknown) {
  const code = workspaceErrorCode(error);
  if (["42P01", "42703"].includes(code))
    return "Your workspace needs a server database update. Contact support so the pending migrations can be applied.";
  if (
    [
      "QUERY_TIMEOUT",
      "QUEUE_TIMEOUT",
      "57014",
      "55P03",
      "CANCEL_TIMEOUT",
      "CANCEL_UNANSWERED",
    ].includes(code)
  )
    return "The workspace database did not respond in time. Please try again. If this continues, contact support.";
  return "We could not load your workspace. Please try again. If this continues, contact support with the reference below. Your business data has been preserved.";
}
export function workspaceCancellationReason(error: unknown) {
  // Match only standard PostgreSQL messages and emit static labels. Never
  // return raw messages: Drizzle errors may contain SQL and private parameters.
  let current = error;
  for (
    let depth = 0;
    depth < 5 && current && typeof current === "object";
    depth++
  ) {
    const item = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (item.code === "57014") {
      if (item.message === "canceling statement due to statement timeout")
        return "statement_timeout";
      if (item.message === "canceling statement due to user request")
        return "cancel_request";
      if (item.message === "canceling statement due to conflict with recovery")
        return "recovery_conflict";
    }
    current = item.cause;
  }
  return "unclassified";
}
export function workspaceErrorMessage(error: unknown) {
  if (error instanceof WorkspaceCreationError) return error.message;
  let current = error;
  for (
    let depth = 0;
    depth < 5 && current && typeof current === "object";
    depth++
  ) {
    const record = current as { code?: unknown; cause?: unknown };
    if (record.code === "42P01" || record.code === "42703")
      return "Workspace setup is not ready on the server. The platform administrator needs to apply the pending database migration. Your account is safe; please try again after setup is complete.";
    if (record.code === "23505")
      return "That website address is already in use. Please choose another address.";
    if (record.code === "42501")
      return "Workspace setup needs administrator attention. The database permissions are not configured correctly.";
    if (record.code === "57014" || record.code === "55P03")
      return "Workspace setup timed out while waiting for the database. Check your dashboard before trying again, or contact support if this continues.";
    if (
      [
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
        "CONNECT_TIMEOUT",
        "CONNECTION_CLOSED",
      ].includes(String(record.code))
    )
      return "We could not reach the workspace database. Please try again in a moment.";
    current = record.cause;
  }
  return "We could not create your workspace. Please try again. If this continues, contact the platform administrator.";
}
