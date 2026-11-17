import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "./supabase-config";
export function storageAdmin() {
  const key = process.env.SUPABASE_STORAGE_SERVICE_KEY;
  if (!key) throw new Error("Storage setup is pending. Contact support.");
  return createClient(getSupabaseConfiguration().url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        }),
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
