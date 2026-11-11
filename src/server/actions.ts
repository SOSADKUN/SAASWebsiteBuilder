"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { user, authorize, admin, supabase } from "@/lib/auth";
import { getApplicationOrigin } from "@/lib/auth-redirect";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import {
  initialLayout,
  layoutSchema,
  validateSelection,
  safeUrl,
  definitions,
  type Section,
} from "@/lib/models";
export async function signIn(form: FormData) {
  const client = await supabase();
  const { error } = await client.auth.signInWithPassword({
    email: z.email().parse(form.get("email")),
    password: z.string().min(8).parse(form.get("password")),
  });
  if (error)
    redirect("/login?error=Unable+to+sign+in.+Check+your+email+and+password.");
  redirect("/dashboard");
}
export async function signUp(form: FormData) {
  const client = await supabase();
  const { error } = await client.auth.signUp({
    email: z.email().parse(form.get("email")),
    password: z.string().min(8).parse(form.get("password")),
    options: { emailRedirectTo: `${getApplicationOrigin()}/auth/confirm` },
  });
  redirect(
    error
      ? "/login?error=Unable+to+register.+Please+try+again."
      : "/login?message=Check+your+email+to+confirm+your+account,+then+sign+in.",
  );
}
export async function signOut() {
  const client = await supabase();
  await client.auth.signOut();
  redirect("/login");
}
export async function createBusiness(form: FormData) {
  const u = await user();
  const name = z.string().min(2).max(100).parse(form.get("name"));
  const slug = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(60)
    .parse(form.get("slug"));
  const database = db();
  await database.transaction(async (tx) => {
    await tx
      .insert(s.profiles)
      .values({ id: u.id, name: u.email ?? "Merchant" })
      .onConflictDoNothing();
    const [merchant] = await tx
      .insert(s.merchants)
      .values({ name, slug })
      .returning();
    await tx
      .insert(s.memberships)
      .values({ merchantId: merchant.id, userId: u.id });
    const [website] = await tx
      .insert(s.websites)
      .values({ merchantId: merchant.id, title: name })
      .returning();
    await tx.insert(s.pages).values({
      merchantId: merchant.id,
      websiteId: website.id,
      title: "Home",
      draft: initialLayout(name),
    });
    for (const [position, category] of [
      "Coffee",
      "Tea",
      "Pastries",
      "Food",
      "Other",
    ].entries())
      await tx
        .insert(s.categories)
        .values({ merchantId: merchant.id, name: category, position });
  });
  redirect("/dashboard");
}
export async function saveLayout(
  merchantId: string,
  pageId: string,
  sections: Section[],
  expectedRevision: number,
  publish = false,
) {
  await authorize(z.uuid().parse(merchantId));
  z.uuid().parse(pageId);
  layoutSchema.parse(sections);
  z.number().int().min(0).parse(expectedRevision);
  z.boolean().parse(publish);
  const database = db();
  return database.transaction(async (tx) => {
    const [merchant] = await tx
      .select()
      .from(s.merchants)
      .where(eq(s.merchants.id, merchantId))
      .for("update");
    if (!merchant) throw new Error("Business not found");
    const page = await tx.query.pages.findFirst({
      where: and(eq(s.pages.id, pageId), eq(s.pages.merchantId, merchantId)),
    });
    if (!page) throw new Error("Page not found");
    if (page.revision !== expectedRevision)
      throw new Error(
        "This page changed in another tab. Restore the saved draft before saving.",
      );
    const owned = await tx
      .select()
      .from(s.entitlements)
      .where(eq(s.entitlements.merchantId, merchantId));
    const catalog = await tx.select().from(s.componentDefinitions);
    validateSelection(
      sections,
      owned.map((e) => e.componentKey),
      catalog.filter((d) => d.active).map((d) => d.key),
      catalog.filter((d) => d.premium).map((d) => d.key),
    );
    await tx
      .update(s.pages)
      .set({
        draft: sections,
        ...(publish ? { published: sections } : {}),
        revision: page.revision + 1,
        updatedAt: new Date(),
      })
      .where(eq(s.pages.id, pageId));
    await tx
      .delete(s.pageSections)
      .where(
        and(
          eq(s.pageSections.pageId, pageId),
          eq(s.pageSections.merchantId, merchantId),
        ),
      );
    await tx.insert(s.pageSections).values(
      sections.map((section, position) => ({
        id: section.id,
        merchantId,
        pageId,
        componentKey: section.key,
        version: section.version,
        position,
        visible: section.visible,
        settings: section.settings,
      })),
    );
    if (publish)
      await tx.insert(s.revisions).values({ merchantId, pageId, sections });
    revalidatePath(`/sites/${merchant.slug}`);
    return { revision: page.revision + 1 };
  });
}
export async function restoreDraft(merchantId: string, pageId: string) {
  await authorize(z.uuid().parse(merchantId));
  const page = await db().query.pages.findFirst({
    where: and(
      eq(s.pages.id, z.uuid().parse(pageId)),
      eq(s.pages.merchantId, merchantId),
    ),
  });
  if (!page) throw new Error("Page not found");
  return { sections: page.draft, revision: page.revision };
}
export async function unlock(merchantId: string, key: string) {
  await authorize(z.uuid().parse(merchantId));
  const definition = await db().query.componentDefinitions.findFirst({
    where: and(
      eq(s.componentDefinitions.key, key),
      eq(s.componentDefinitions.active, true),
    ),
  });
  if (!definition || !definitions.some((d) => d.key === key))
    throw new Error("Component unavailable");
  await db()
    .insert(s.entitlements)
    .values({ merchantId, componentKey: key, source: "demo" })
    .onConflictDoNothing();
  revalidatePath("/dashboard");
}
const productSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000),
  price: z.number().int().min(0).max(10000000),
  image: safeUrl,
  categoryId: z.uuid(),
  available: z.boolean(),
  position: z.number().int().min(0).max(10000),
});
export async function saveProduct(
  merchantId: string,
  input: z.infer<typeof productSchema>,
) {
  await authorize(z.uuid().parse(merchantId));
  const value = productSchema.parse(input);
  const database = db();
  const category = await database.query.categories.findFirst({
    where: and(
      eq(s.categories.id, value.categoryId),
      eq(s.categories.merchantId, merchantId),
    ),
  });
  if (!category) throw new Error("Invalid category");
  if (value.id) {
    const rows = await database
      .update(s.products)
      .set({ ...value, updatedAt: new Date() })
      .where(
        and(eq(s.products.id, value.id), eq(s.products.merchantId, merchantId)),
      )
      .returning();
    if (!rows.length) throw new Error("Product not found");
  } else await database.insert(s.products).values({ ...value, merchantId });
  revalidatePath("/dashboard");
}
export async function deleteProduct(merchantId: string, id: string) {
  await authorize(merchantId);
  await db()
    .delete(s.products)
    .where(
      and(
        eq(s.products.merchantId, merchantId),
        eq(s.products.id, z.uuid().parse(id)),
      ),
    );
  revalidatePath("/dashboard");
}
export async function saveCategory(
  merchantId: string,
  name: string,
  id?: string,
) {
  await authorize(merchantId);
  name = z.string().min(1).max(60).parse(name);
  if (id)
    await db()
      .update(s.categories)
      .set({ name })
      .where(
        and(
          eq(s.categories.merchantId, merchantId),
          eq(s.categories.id, z.uuid().parse(id)),
        ),
      );
  else await db().insert(s.categories).values({ merchantId, name });
  revalidatePath("/dashboard");
}
export async function deleteCategory(merchantId: string, id: string) {
  await authorize(merchantId);
  const product = await db().query.products.findFirst({
    where: and(
      eq(s.products.merchantId, merchantId),
      eq(s.products.categoryId, z.uuid().parse(id)),
    ),
  });
  if (product)
    throw new Error("Move or delete products in this category first");
  await db()
    .delete(s.categories)
    .where(
      and(eq(s.categories.merchantId, merchantId), eq(s.categories.id, id)),
    );
  revalidatePath("/dashboard");
}
export async function createPage(
  merchantId: string,
  title: string,
  path: string,
) {
  await authorize(merchantId);
  title = z.string().min(1).max(80).parse(title);
  path = z
    .string()
    .regex(/^\/[a-z0-9-]+$/)
    .max(80)
    .parse(path);
  const website = await db().query.websites.findFirst({
    where: eq(s.websites.merchantId, merchantId),
  });
  if (!website) throw new Error("Website not found");
  await db()
    .insert(s.pages)
    .values({
      merchantId,
      websiteId: website.id,
      title,
      path,
      draft: initialLayout(website.title),
    });
  revalidatePath("/dashboard");
}
export async function updateBusiness(merchantId: string, form: FormData) {
  await authorize(merchantId);
  const value = z
    .object({
      name: z.string().min(2).max(100),
      description: z.string().max(1000),
      address: z.string().max(300),
      hours: z.string().max(300),
      phone: z.string().regex(/^\d{0,15}$/),
    })
    .parse(Object.fromEntries(form));
  await db()
    .update(s.merchants)
    .set({ ...value, updatedAt: new Date() })
    .where(eq(s.merchants.id, merchantId));
  revalidatePath("/dashboard");
}
export async function upload(merchantId: string, form: FormData) {
  await authorize(merchantId);
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_UPLOAD_BYTES
  )
    throw new Error(`Choose an image up to ${MAX_UPLOAD_LABEL}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let extension = "";
  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    file.type === "image/jpeg"
  )
    extension = "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    file.type === "image/png"
  )
    extension = "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
    file.type === "image/webp"
  )
    extension = "webp";
  if (!extension)
    throw new Error("Only valid JPEG, PNG and WebP images are accepted");
  const path = `${merchantId}/${crypto.randomUUID()}.${extension}`;
  const client = await supabase();
  const { error } = await client.storage
    .from("merchant-media")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = client.storage.from("merchant-media").getPublicUrl(path);
  try {
    await db()
      .insert(s.media)
      .values({
        merchantId,
        path,
        url: data.publicUrl,
        name: file.name.slice(0, 150),
      });
  } catch (error) {
    await client.storage.from("merchant-media").remove([path]);
    throw error;
  }
  revalidatePath("/dashboard");
  return data.publicUrl;
}
export async function adminListing(form: FormData) {
  await admin();
  const key = z.string().parse(form.get("key"));
  if (!definitions.some((d) => d.key === key))
    throw new Error("Only deployed components can be listed");
  const category = z.string().min(1).max(60).parse(form.get("category"));
  const price = z.coerce
    .number()
    .int()
    .min(0)
    .max(1000000)
    .parse(form.get("price"));
  await db().transaction(async (tx) => {
    await tx
      .update(s.componentDefinitions)
      .set({
        category,
        premium: form.get("premium") === "on",
        active: form.get("active") === "on",
      })
      .where(eq(s.componentDefinitions.key, key));
    await tx
      .update(s.storeProducts)
      .set({ price })
      .where(eq(s.storeProducts.componentKey, key));
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
