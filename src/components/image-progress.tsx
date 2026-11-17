import type { ImageProgress as State } from "@/lib/image-upload";
import { formatBytes } from "@/lib/storage-policy";
export function ImageProgress({ state }: { state: State | null }) {
  if (!state) return null;
  const saved =
    state.optimized === undefined
      ? undefined
      : Math.round((1 - state.optimized / state.original) * 100);
  return (
    <div role="status" className="image-progress">
      <p>{state.status}</p>
      <small>
        Original {formatBytes(state.original)}
        {state.optimized !== undefined && (
          <>
            {" "}
            · Optimized {formatBytes(state.optimized)} ·{" "}
            {saved! >= 0
              ? `Saved ${saved}%`
              : `Size increased ${-saved!}% to meet dimension limits`}
          </>
        )}
      </small>
      {state.progress !== undefined && (
        <progress
          aria-label="Image upload progress"
          max={100}
          value={state.progress}
        />
      )}
    </div>
  );
}
