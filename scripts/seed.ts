import { config } from "dotenv";
config({ path: ".env.local" });
config();
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { initialLayout } from "../src/lib/models";
import { registerCatalog } from "./catalog";
import { z } from "zod";
async function main() {
  const url = z.string().min(1).parse(process.env.DATABASE_URL);
  const userId = z.uuid().parse(process.env.SEED_USER_ID);
  const client = postgres(url, { prepare: false, max: 1 });
  const database = drizzle(client);
  try {
    await registerCatalog(database);
    await database.transaction(async (tx) => {
      await tx
        .insert(s.profiles)
        .values({ id: userId, name: "Bloom Café owner" })
        .onConflictDoNothing();
      const [existing] = await tx
        .select()
        .from(s.merchants)
        .where(eq(s.merchants.slug, "bloom-cafe"));
      if (existing) {
        console.log("Demo café already exists. Catalog seed completed.");
        return;
      }
      const [merchant] = await tx
        .insert(s.merchants)
        .values({
          name: "Bloom Café",
          slug: "bloom-cafe",
          description:
            "Your neighborhood space for slow mornings, meaningful conversations, and really good coffee in Kuala Lumpur.",
          address: "24, Jalan Kemuja, Bangsar, Kuala Lumpur",
          hours:
            "Monday – Friday: 8:00 am – 6:00 pm\nSaturday – Sunday: 9:00 am – 7:00 pm",
          phone: "",
        })
        .returning();
      await tx
        .insert(s.memberships)
        .values({ merchantId: merchant.id, userId });
      const [website] = await tx
        .insert(s.websites)
        .values({
          merchantId: merchant.id,
          title: "Bloom Café",
          description: merchant.description,
        })
        .returning();
      const sections = initialLayout();
      sections.find((s) => s.key === "about-story")!.settings.description =
        "We believe the best days start with a good cup and a familiar face. Since 2022, Bloom has been a gathering place for our Bangsar neighborhood. We source our beans with care, bake fresh every morning, and always save a seat for you.";
      sections.find((s) => s.key === "gallery-grid")!.settings.image =
        "/images/cafe/interior.jpg";
      const [page] = await tx
        .insert(s.pages)
        .values({
          merchantId: merchant.id,
          websiteId: website.id,
          title: "Home",
          draft: sections,
          published: sections,
        })
        .returning();
      await tx.insert(s.pageSections).values(
        sections.map((section, position) => ({
          id: section.id,
          merchantId: merchant.id,
          pageId: page.id,
          componentKey: section.key,
          version: section.version,
          position,
          visible: section.visible,
          settings: section.settings,
        })),
      );
      await tx
        .insert(s.revisions)
        .values({ merchantId: merchant.id, pageId: page.id, sections });
      const categoryIds: Record<string, string> = {};
      for (const [position, name] of [
        "Coffee",
        "Tea",
        "Pastries",
        "Food",
        "Other",
      ].entries()) {
        const [category] = await tx
          .insert(s.categories)
          .values({ merchantId: merchant.id, name, position })
          .returning();
        categoryIds[name] = category.id;
      }
      const sample = [
        {
          name: "Signature Flat White",
          description:
            "Double espresso, silky steamed milk, a little everyday magic.",
          price: 1200,
          category: "Coffee",
          photo: "latte",
        },
        {
          name: "Iced Oat Latte",
          description: "Our house espresso over ice with creamy oat milk.",
          price: 1500,
          category: "Coffee",
          photo: "iced-latte",
        },
        {
          name: "Butter Croissant",
          description: "Golden, flaky, and baked fresh every morning.",
          price: 900,
          category: "Pastries",
          photo: "pastry",
        },
        {
          name: "Matcha Latte",
          description: "Ceremonial matcha with your choice of milk.",
          price: 1600,
          category: "Tea",
          photo: "matcha",
        },
        {
          name: "Sourdough Toast",
          description:
            "Avocado, cherry tomatoes and a bright squeeze of lemon.",
          price: 2200,
          category: "Food",
          photo: "toast",
        },
        {
          name: "Chocolate Brownie",
          description: "Deep dark chocolate with a soft, fudgy center.",
          price: 1100,
          category: "Pastries",
          photo: "brownie",
        },
      ];
      await tx.insert(s.products).values(
        sample.map((p, position) => ({
          merchantId: merchant.id,
          categoryId: categoryIds[p.category],
          name: p.name,
          description: p.description,
          price: p.price,
          image: `/images/cafe/${p.photo}.jpg`,
          available: true,
          position,
        })),
      );
      console.log(
        "Seeded Bloom Café. Sign in with the Supabase account associated with SEED_USER_ID.",
      );
    });
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Seed failed");
  process.exitCode = 1;
});
