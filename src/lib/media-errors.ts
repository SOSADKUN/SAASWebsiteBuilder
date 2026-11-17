export class MediaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function missingStorageObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: string;
    status?: number;
    statusCode?: string | number;
  };
  return (
    e.code === "NoSuchKey" ||
    (!e.code && Number(e.status ?? e.statusCode) === 404)
  );
}

export function mediaStorageFailure(error: unknown, verification = false) {
  const e = error as {
    code?: string;
    status?: number;
    statusCode?: string | number;
  } | null;
  const status = Number(e?.status ?? e?.statusCode);
  const denied = status === 401 || status === 403 || e?.code === "AccessDenied";
  return new MediaError(
    denied
      ? "MEDIA_STORAGE_DENIED"
      : verification
        ? "MEDIA_STORAGE_VERIFY"
        : "MEDIA_STORAGE_REMOVE",
    verification ? "Storage verification failed" : "Storage removal failed",
  );
}

export function mediaDeleteMessage(code: string) {
  switch (code) {
    case "MEDIA_STORAGE_CONFIG":
      return "Image storage is not configured on the server. Contact support.";
    case "MEDIA_STORAGE_DENIED":
      return "Image storage denied this request. Contact support to check server Storage permissions.";
    case "MEDIA_STORAGE_REMOVE":
      return "Image storage could not complete deletion. Your library record was retained; please retry.";
    case "MEDIA_STORAGE_VERIFY":
      return "We could not confirm that the image was removed. Your library record was retained; please retry.";
    case "MEDIA_INVALID_PATH":
      return "This image has an invalid storage reference. Contact support for a safe repair.";
    default:
      return "Could not complete image deletion. Please try again. If it continues, contact support.";
  }
}
