vi.mock("@/lib/subscription-service", () => ({ requireSubscription: vi.fn() }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialLayout, definitions } from "../src/lib/models";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  admin: vi.fn(),
  db: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  admin: mocks.admin,
  user: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { saveLayout, adminListing, saveProduct } from "../src/server/actions";
const merchantId = "11111111-1111-4111-8111-111111111111",
  pageId = "22222222-2222-4222-8222-222222222222";
function repository(
  options: { missing?: boolean; conflict?: boolean; premium?: boolean } = {},
) {
  const updated = vi.fn();
  const inserted = vi.fn();
  const where = vi
    .fn()
    .mockReturnValue({ for: () => [{ id: merchantId, slug: "bloom-cafe" }] });
  const tx = {
    select: vi.fn().mockReturnValue({
      from: () => ({
        where,
        then: (resolve: (v: unknown) => void) =>
          resolve(definitions.map((d) => ({ ...d, active: true }))),
      }),
    }),
    query: {
      pages: {
        findFirst: vi
          .fn()
          .mockResolvedValue(
            options.missing
              ? undefined
              : { id: pageId, merchantId, revision: options.conflict ? 1 : 0 },
          ),
      },
    },
    update: vi.fn().mockReturnValue({
      set: (value: unknown) => {
        updated(value);
        return { where: vi.fn() };
      },
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    insert: vi.fn().mockReturnValue({ values: inserted }),
  };
  let count = 0;
  tx.select.mockImplementation(() => {
    count++;
    if (count === 1) return { from: () => ({ where }) };
    if (count === 2) return { from: () => ({ where: () => [] }) };
    return { from: () => definitions.map((d) => ({ ...d, active: true })) };
  });
  const database = {
    transaction: vi.fn(async (fn: (v: unknown) => unknown) => fn(tx)),
  };
  mocks.db.mockReturnValue(database);
  return { updated, inserted, tx, database };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ id: "user-a" });
});
describe("tenant-authorized publishing", () => {
  it("rejects an unauthorized tenant before querying or mutating data", async () => {
    mocks.authorize.mockRejectedValue(new Error("Business access denied"));
    await expect(
      saveLayout(merchantId, pageId, initialLayout(), 0, true),
    ).rejects.toThrow("access denied");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects another tenant’s page", async () => {
    const r = repository({ missing: true });
    await expect(
      saveLayout(merchantId, pageId, initialLayout(), 0, true),
    ).rejects.toThrow("Page not found");
    expect(r.updated).not.toHaveBeenCalled();
  });
  it("does not overwrite a concurrent edit", async () => {
    const r = repository({ conflict: true });
    await expect(
      saveLayout(merchantId, pageId, initialLayout(), 0),
    ).rejects.toThrow("another tab");
    expect(r.updated).not.toHaveBeenCalled();
  });
  it("saves a draft without changing the published snapshot", async () => {
    const r = repository();
    const sections = initialLayout();
    expect(await saveLayout(merchantId, pageId, sections, 0)).toEqual({
      revision: 1,
    });
    expect(r.updated).toHaveBeenCalledWith(
      expect.objectContaining({ draft: sections, revision: 1 }),
    );
    expect(r.updated.mock.calls[0][0]).not.toHaveProperty("published");
  });
  it("publishes the validated layout and records a revision", async () => {
    const r = repository();
    const sections = initialLayout();
    await saveLayout(merchantId, pageId, sections, 0, true);
    expect(r.updated).toHaveBeenCalledWith(
      expect.objectContaining({ published: sections, draft: sections }),
    );
    expect(r.inserted).toHaveBeenCalledWith({ merchantId, pageId, sections });
  });
  it("enforces entitlements on the server before writing", async () => {
    const r = repository();
    const sections = initialLayout();
    sections[1].key = "hero-split";
    await expect(
      saveLayout(merchantId, pageId, sections, 0, true),
    ).rejects.toThrow("Unlock");
    expect(r.updated).not.toHaveBeenCalled();
  });
  it("denies merchant access to admin listing mutations", async () => {
    mocks.admin.mockRejectedValue(new Error("Platform admin access required"));
    await expect(adminListing(new FormData())).rejects.toThrow("admin access");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects a product category belonging to another tenant", async () => {
    mocks.db.mockReturnValue({
      query: {
        categories: { findFirst: vi.fn().mockResolvedValue(undefined) },
      },
    });
    await expect(
      saveProduct(merchantId, {
        name: "Coffee",
        description: "",
        price: 1200,
        image: "",
        categoryId: pageId,
        available: true,
        position: 0,
      }),
    ).rejects.toThrow("Invalid category");
  });
});
