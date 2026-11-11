export class WorkspaceCreationError extends Error {
  constructor() {
    super(
      "This account has already created a trial business. Open your existing workspace or contact support.",
    );
  }
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
