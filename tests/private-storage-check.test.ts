import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  privateStorageIssues,
  privateStoragePrivilegesSql,
  privateStorageTables,
} from "../scripts/private-storage-check";

const database = new PGlite();
beforeAll(async () => {
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE inherited_reader;
    GRANT inherited_reader TO authenticated;
    CREATE TABLE media_upload_reservations(id integer);
    CREATE TABLE merchant_storage_entitlements(id integer);
    ALTER TABLE media_upload_reservations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE merchant_storage_entitlements ENABLE ROW LEVEL SECURITY;
  `);
});
afterAll(async () => {
  await database.close();
});

async function privileges() {
  return (
    await database.query<{
      table_name: string;
      role_name: string;
      privilege: string;
    }>(privateStoragePrivilegesSql)
  ).rows;
}

it("accepts private RLS tables without browser policies or privileges", async () => {
  expect(privateStorageTables).toHaveLength(2);
  expect(privateStorageIssues(await privileges(), [])).toEqual([]);
});

it("detects PUBLIC, inherited, column and non-read privileges even with RLS", async () => {
  await database.exec(`
    GRANT SELECT ON media_upload_reservations TO PUBLIC;
    GRANT UPDATE(id) ON merchant_storage_entitlements TO inherited_reader;
    GRANT TRUNCATE ON merchant_storage_entitlements TO anon;
  `);
  try {
    expect(await privileges()).toEqual(
      expect.arrayContaining([
        {
          table_name: "media_upload_reservations",
          role_name: "anon",
          privilege: "SELECT",
        },
        {
          table_name: "media_upload_reservations",
          role_name: "authenticated",
          privilege: "SELECT",
        },
        {
          table_name: "merchant_storage_entitlements",
          role_name: "authenticated",
          privilege: "UPDATE",
        },
        {
          table_name: "merchant_storage_entitlements",
          role_name: "anon",
          privilege: "TRUNCATE",
        },
      ]),
    );
    expect(privateStorageIssues(await privileges(), []).length).toBeGreaterThan(
      0,
    );
  } finally {
    await database.exec(`
      REVOKE SELECT ON media_upload_reservations FROM PUBLIC;
      REVOKE UPDATE(id) ON merchant_storage_entitlements FROM inherited_reader;
      REVOKE TRUNCATE ON merchant_storage_entitlements FROM anon;
    `);
  }
});

it("rejects policies on either server-only table without ignoring other tables", () => {
  expect(
    privateStorageIssues(
      [],
      [
        { schemaname: "public", tablename: "media_upload_reservations" },
        { schemaname: "public", tablename: "merchant_storage_entitlements" },
        { schemaname: "public", tablename: "menu_products" },
      ],
    ),
  ).toEqual([
    "Unexpected policy on server-only table: media_upload_reservations",
    "Unexpected policy on server-only table: merchant_storage_entitlements",
  ]);
});
