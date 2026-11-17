"use client";
import { useEffect, useState } from "react";
import { companyStorage } from "@/server/storage-actions";
import { formatBytes, storageWarning } from "@/lib/storage-policy";
export function CompanyStorage({ merchantId }: { merchantId: string }) {
  const [usage, setUsage] = useState<{
    used: number;
    reserved: number;
    limit: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      companyStorage(merchantId)
        .then((v) => {
          if (alive) {
            setUsage(v);
            setError("");
          }
        })
        .catch(() => {
          if (alive)
            setError(
              "Storage usage is unavailable. Contact support if this continues.",
            );
        });
    void refresh();
    window.addEventListener("servqoo:media-change", refresh);
    return () => {
      alive = false;
      window.removeEventListener("servqoo:media-change", refresh);
    };
  }, [merchantId]);
  return (
    <section className="panel company-storage" aria-label="Available Storage">
      <h3>Available Storage:</h3>
      {error ? (
        <p role="alert">{error}</p>
      ) : !usage ? (
        <p role="status">Checking capacity...</p>
      ) : (
        <>
          <p>
            {formatBytes(
              Math.max(0, usage.limit - usage.used - usage.reserved),
            )}{" "}
            available of {formatBytes(usage.limit)}
          </p>
          <progress
            aria-label="Company storage used"
            max={usage.limit}
            value={Math.min(usage.used + usage.reserved, usage.limit)}
          />
          {usage.reserved > 0 && (
            <p>
              {formatBytes(usage.reserved)} reserved for pending uploads. Retry
              interrupted images; contact support to reconcile abandoned
              uploads.
            </p>
          )}
          {storageWarning(usage.used + usage.reserved, usage.limit) !==
            "normal" && (
            <p role="alert">
              {usage.used + usage.reserved >= usage.limit
                ? "Storage is full or over quota. Existing images are preserved; delete unused images before uploading."
                : usage.used + usage.reserved >= usage.limit * 0.95
                  ? "Storage is at least 95% full. Remove unused images soon."
                  : "Storage is at least 80% full."}
            </p>
          )}
          <small>Storage is shared by your website and menu images.</small>
        </>
      )}
    </section>
  );
}
