export type DatabaseForeignKey = {
  name: string;
  source_table: string;
  source_columns: string[];
  target_schema: string;
  target_table: string;
  target_columns: string[];
  validated: boolean;
  delete_action: string;
  update_action: string;
};
type ExpectedForeignKey = {
  sourceTable: string;
  sourceColumns: string[];
  targetSchema: string;
  targetTable: string;
  targetColumns: string[];
  onDelete: string;
  onUpdate: string;
};
const actions: Record<string, string> = {
  "no action": "a",
  restrict: "r",
  cascade: "c",
  "set null": "n",
  "set default": "d",
};
export function matchesForeignKey(
  actual: DatabaseForeignKey,
  expected: ExpectedForeignKey,
) {
  // PostgreSQL truncates identifiers to max_identifier_length bytes. Compare
  // the enforced relationship instead of relying on a generated constraint name.
  return (
    actual.validated &&
    actual.source_table === expected.sourceTable &&
    actual.target_schema === expected.targetSchema &&
    actual.target_table === expected.targetTable &&
    JSON.stringify(actual.source_columns) ===
      JSON.stringify(expected.sourceColumns) &&
    JSON.stringify(actual.target_columns) ===
      JSON.stringify(expected.targetColumns) &&
    actual.delete_action === actions[expected.onDelete] &&
    actual.update_action === actions[expected.onUpdate]
  );
}
