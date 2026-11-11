import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authorize } from "@/lib/auth";
import { db } from "@/db";
import * as s from "@/db/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const id = z.uuid().safeParse(request.nextUrl.searchParams.get("merchantId"));
  if (!id.success)
    return NextResponse.json({ error: "Invalid business ID" }, { status: 400 });
  await authorize(id.data, "workspace:view");
  // No subscription gate: merchants retain data access after trial expiry.
  const data = await db().transaction(
    async (tx) => {
      const business = await tx
        .select()
        .from(s.merchants)
        .where(eq(s.merchants.id, id.data));
      const tables = {
        websites: s.websites,
        pages: s.pages,
        sections: s.pageSections,
        categories: s.categories,
        products: s.products,
        media: s.media,
        revisions: s.revisions,
        entitlements: s.entitlements,
        subscriptions: s.merchantSubscriptions,
        subscriptionEvents: s.subscriptionEvents,
      };
      const entries = await Promise.all(
        Object.entries(tables).map(async ([key, table]) => [
          key,
          await tx.select().from(table).where(eq(table.merchantId, id.data)),
        ]),
      );
      return {
        formatVersion: 1,
        business: business[0],
        ...Object.fromEntries(entries),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition":
        'attachment; filename="servqo-business-export.json"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
