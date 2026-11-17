export const MIB = 1024 * 1024;
export const storageLimits = {
  free: 20 * MIB,
  trial: 50 * MIB,
  verified: 100 * MIB,
} as const;
export function storageWarning(used: number, limit: number) {
  const ratio = used / limit;
  return ratio >= 1
    ? "full"
    : ratio >= 0.95
      ? "critical"
      : ratio >= 0.8
        ? "warning"
        : "normal";
}
export function formatBytes(value: number) {
  return `${(value / MIB).toFixed(2)} MiB`;
}

// The migration runner and disposable SQL fixtures compile the same limits.
export function storagePolicySql(source: string) {
  return source
    .replaceAll("__FREE_BYTES__", String(storageLimits.free))
    .replaceAll("__TRIAL_BYTES__", String(storageLimits.trial))
    .replaceAll("__VERIFIED_BYTES__", String(storageLimits.verified));
}
