import { beforeEach, expect, it, vi } from "vitest";
import { Children, isValidElement, type ReactNode } from "react";
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  pending: Promise.resolve(),
}));
vi.mock("@/server/workspace-actions", () => ({ deleteMedia: mocks.remove }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: () => ({ current: null }),
  useEffect: () => {},
  useState: (initial: unknown) => [initial, vi.fn()],
  useTransition: () => [
    false,
    (run: () => Promise<void>) => {
      mocks.pending = run();
    },
  ],
}));
import { DeleteMediaDialog } from "../src/components/dashboard/delete-media-dialog";

function clickDelete(node: ReactNode): boolean {
  for (const child of Children.toArray(node)) {
    if (
      !isValidElement<{
        className?: string;
        onClick?: () => void;
        children?: ReactNode;
      }>(child)
    )
      continue;
    if (child.props.className?.includes("media-delete-button")) {
      child.props.onClick?.();
      return true;
    }
    if (clickDelete(child.props.children)) return true;
  }
  return false;
}
beforeEach(() => {
  vi.clearAllMocks();
});
it("signals library refresh after a confirmed deletion, including an already-absent record", async () => {
  mocks.remove.mockResolvedValue({ ok: true });
  const refresh = vi.fn();
  const view = DeleteMediaDialog({
    merchantId: "merchant",
    asset: { id: "asset", url: "https://example.test/image", name: "image" },
    onClose: vi.fn(),
    onDeleted: refresh,
  });
  expect(clickDelete(view)).toBe(true);
  await mocks.pending;
  expect(refresh).toHaveBeenCalledOnce();
});
it("does not remove the visible card or refresh as success after an uncertain failure", async () => {
  mocks.remove.mockResolvedValue({
    ok: false,
    error: "Unable to confirm",
    reference: "ref",
  });
  const refresh = vi.fn();
  const view = DeleteMediaDialog({
    merchantId: "merchant",
    asset: { id: "asset", url: "https://example.test/image", name: "image" },
    onClose: vi.fn(),
    onDeleted: refresh,
  });
  clickDelete(view);
  await mocks.pending;
  expect(refresh).not.toHaveBeenCalled();
});
