import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ remove: vi.fn(), revalidate: vi.fn() }));
vi.mock("../src/server/workspace-service", () => ({
  removeMediaAsset: mocks.remove,
  loadOverviewMetrics: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
import { deleteMedia } from "../src/server/workspace-actions";
import { MediaError, missingStorageObject } from "../src/lib/media-errors";
import { workspaceErrorCode } from "../src/lib/workspace-errors";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue(undefined);
});
it("invalidates the library layout after normal or already-absent deletion", async () => {
  expect(await deleteMedia("merchant", "asset")).toEqual({ ok: true });
  expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
});
it("returns classified safe feedback without invalidating failed deletions", async () => {
  mocks.remove.mockRejectedValue(
    new MediaError("MEDIA_STORAGE_DENIED", "secret provider details"),
  );
  const result = await deleteMedia("merchant", "asset");
  expect(result).toMatchObject({
    ok: false,
    error: expect.stringContaining("permissions"),
    reference: expect.any(String),
  });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(mocks.revalidate).not.toHaveBeenCalled();
  expect(
    workspaceErrorCode(new MediaError("MEDIA_STORAGE_DENIED", "secret")),
  ).toBe("MEDIA_STORAGE_DENIED");
});
it("never treats permission, bucket, or ambiguous errors as missing files", () => {
  expect(missingStorageObject({ code: "NoSuchKey", status: 404 })).toBe(true);
  expect(missingStorageObject({ status: 404 })).toBe(true);
  expect(missingStorageObject({ code: "NoSuchBucket", status: 404 })).toBe(
    false,
  );
  expect(missingStorageObject({ code: "AccessDenied", status: 403 })).toBe(
    false,
  );
  expect(missingStorageObject(new Error("network"))).toBe(false);
});
