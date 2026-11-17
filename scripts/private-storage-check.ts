// These tables are accessed only by trusted server code, never browser clients.
export const privateStorageTables = [
  "media_upload_reservations",
  "merchant_storage_entitlements",
] as const;

// Effective checks include PUBLIC grants and inherited role privileges. Column
// grants must be checked separately: revoking table grants does not remove them.
export const privateStoragePrivilegesSql = `
  SELECT c.relname AS table_name, r.rolname AS role_name,
    p.privilege
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN pg_roles r
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
    ('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
  WHERE n.nspname='public' AND c.relkind='r'
    AND c.relname IN ('media_upload_reservations','merchant_storage_entitlements')
    AND r.rolname IN ('anon','authenticated')
    AND (has_table_privilege(r.oid,c.oid,p.privilege)
      OR CASE WHEN p.privilege IN ('SELECT','INSERT','UPDATE','REFERENCES')
        THEN has_any_column_privilege(r.oid,c.oid,p.privilege)
        ELSE false END)
`;

export function privateStorageIssues(
  privileges: { table_name: string; role_name: string; privilege: string }[],
  policies: { schemaname: string; tablename: string }[],
): string[] {
  return [
    ...privileges.map(
      (p) =>
        `Unexpected browser privilege: ${p.table_name} (${p.role_name}: ${p.privilege})`,
    ),
    ...privateStorageTables
      .filter((name) =>
        policies.some((p) => p.schemaname === "public" && p.tablename === name),
      )
      .map((name) => `Unexpected policy on server-only table: ${name}`),
  ];
}
