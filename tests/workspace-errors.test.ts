import { describe, it, expect } from "vitest";
import {
  workspaceErrorMessage,
  WorkspaceCreationError,
} from "../src/lib/workspace-errors";
describe("workspace creation errors", () => {
  it("explains missing migrations through wrapped database errors", () => {
    for (const code of ["42P01", "42703"]) {
      const message = workspaceErrorMessage({
        cause: { code, message: "private connection and query" },
      });
      expect(message).toContain("pending database migration");
      expect(message).not.toContain("private");
    }
  });
  it("provides safe duplicate-address, claim and connectivity messages", () => {
    expect(workspaceErrorMessage({ code: "23505" })).toContain(
      "address is already in use",
    );
    expect(workspaceErrorMessage(new WorkspaceCreationError())).toContain(
      "already created a trial business",
    );
    expect(
      workspaceErrorMessage({ cause: { code: "CONNECT_TIMEOUT" } }),
    ).toContain("could not reach");
    expect(workspaceErrorMessage(new Error("secret"))).not.toContain("secret");
  });
});
