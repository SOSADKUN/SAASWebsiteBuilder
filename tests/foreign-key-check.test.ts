import { describe, expect, it } from "vitest";
import {
  matchesForeignKey,
  type DatabaseForeignKey,
} from "../scripts/foreign-key-check";
const actual: DatabaseForeignKey = {
  name: "merchant_entitlements_component_key_component_definitions_key_f",
  source_table: "merchant_entitlements",
  source_columns: ["component_key"],
  target_schema: "public",
  target_table: "component_definitions",
  target_columns: ["key"],
  validated: true,
  delete_action: "a",
  update_action: "a",
};
const expected = {
  sourceTable: "merchant_entitlements",
  sourceColumns: ["component_key"],
  targetSchema: "public",
  targetTable: "component_definitions",
  targetColumns: ["key"],
  onDelete: "no action",
  onUpdate: "no action",
};
describe("foreign key inspection", () => {
  it("recognizes PostgreSQL-truncated and renamed constraints", () => {
    expect(matchesForeignKey(actual, expected)).toBe(true);
    expect(
      matchesForeignKey({ ...actual, name: "custom_name" }, expected),
    ).toBe(true);
  });
  it("rejects incorrect or unvalidated relationships", () => {
    for (const change of [
      { source_table: "other" },
      { source_columns: ["other"] },
      { target_schema: "other" },
      { target_table: "other" },
      { target_columns: ["other"] },
      { validated: false },
      { delete_action: "c" },
      { update_action: "c" },
    ]) {
      expect(matchesForeignKey({ ...actual, ...change }, expected)).toBe(false);
    }
  });
  it("preserves column order for composite foreign keys", () => {
    expect(
      matchesForeignKey(
        { ...actual, source_columns: ["a", "b"], target_columns: ["x", "y"] },
        { ...expected, sourceColumns: ["b", "a"], targetColumns: ["x", "y"] },
      ),
    ).toBe(false);
  });
});
