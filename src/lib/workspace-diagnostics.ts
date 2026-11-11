import { workspaceErrorCode } from "./workspace-errors";

export function workspaceTrace(operation = "workspace.create") {
  const reference = crypto.randomUUID();
  const started = performance.now();
  function log(
    stage: string,
    outcome: "started" | "completed" | "failed",
    extra: Record<string, string | number> = {},
  ) {
    // Only server-generated IDs, static stage names, durations and allowlisted
    // codes are logged. Never log forms, email, SQL, tokens or connection URLs.
    console.info(
      JSON.stringify({
        operation,
        reference,
        stage,
        outcome,
        totalMs: Math.round(performance.now() - started),
        ...extra,
      }),
    );
  }
  return {
    reference,
    async step<T>(stage: string, run: () => PromiseLike<T>): Promise<T> {
      const start = performance.now();
      log(stage, "started");
      try {
        const result = await run();
        log(stage, "completed", {
          durationMs: Math.round(performance.now() - start),
        });
        return result;
      } catch (error) {
        log(stage, "failed", {
          durationMs: Math.round(performance.now() - start),
          errorCode: workspaceErrorCode(error),
        });
        throw error;
      }
    },
    finish: () => log("ready_to_redirect", "completed"),
    fail: (error: unknown) =>
      log("request", "failed", { errorCode: workspaceErrorCode(error) }),
  };
}
