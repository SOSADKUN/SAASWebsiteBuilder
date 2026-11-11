import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { memberships, profiles } from "@/db/schema";
import {
  getSupabaseConfiguration,
  hasSupabaseConfiguration,
} from "./supabase-config";
import {
  roleHasCapability,
  type MerchantCapability,
} from "./merchant-capabilities";
export async function supabase() {
  const jar = await cookies();
  const configuration = getSupabaseConfiguration();
  return createServerClient(configuration.url, configuration.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components cannot set cookies; proxy refreshes sessions. */
        }
      },
    },
  });
}
export async function user() {
  if (!hasSupabaseConfiguration()) redirect("/login");
  const client = await supabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  return user;
}
export async function authorize(
  merchantId: string,
  capability?: MerchantCapability,
) {
  const u = await user();
  const membership = await db().query.memberships.findFirst({
    where: and(
      eq(memberships.userId, u.id),
      eq(memberships.merchantId, merchantId),
    ),
  });
  if (!membership) throw new Error("Business access denied");
  if (capability && !roleHasCapability(membership.role, capability))
    throw new Error("Workspace permission required");
  return u;
}
export async function admin() {
  const u = await user();
  const p = await db().query.profiles.findFirst({
    where: eq(profiles.id, u.id),
  });
  if (p?.role !== "admin") throw new Error("Platform admin access required");
  return u;
}
