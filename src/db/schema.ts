import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import type { Section } from "../lib/models";
const id = () => uuid("id").primaryKey().defaultRandom();
const created = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const profiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("merchant"),
  createdAt: created(),
});
export const merchants = pgTable("merchants", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  address: text("address").notNull().default(""),
  hours: text("hours").notNull().default(""),
  phone: text("phone").notNull().default(""),
  createdAt: created(),
  updatedAt: created(),
});
export const memberships = pgTable(
  "merchant_users",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    role: text("role").notNull().default("owner"),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("membership_unique").on(t.merchantId, t.userId),
    index("membership_user").on(t.userId),
  ],
);
export const websites = pgTable(
  "websites",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .unique()
      .references(() => merchants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    createdAt: created(),
  },
  (t) => [uniqueIndex("website_tenant_id").on(t.merchantId, t.id)],
);
export const pages = pgTable(
  "pages",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    path: text("path").notNull().default("/"),
    title: text("title").notNull(),
    draft: jsonb("draft").$type<Section[]>().notNull(),
    published: jsonb("published").$type<Section[]>(),
    revision: integer("revision").notNull().default(0),
    updatedAt: created(),
  },
  (t) => [
    uniqueIndex("page_path").on(t.websiteId, t.path),
    index("page_merchant").on(t.merchantId),
    uniqueIndex("page_tenant_id").on(t.merchantId, t.id),
    foreignKey({
      columns: [t.merchantId, t.websiteId],
      foreignColumns: [websites.merchantId, websites.id],
      name: "page_website_tenant_fk",
    }).onDelete("cascade"),
  ],
);
export const componentDefinitions = pgTable("component_definitions", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  premium: boolean("premium").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});
export const componentVersions = pgTable(
  "component_versions",
  {
    id: id(),
    componentKey: text("component_key")
      .notNull()
      .references(() => componentDefinitions.key),
    version: integer("version").notNull(),
    schema: jsonb("schema").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("component_version_unique").on(t.componentKey, t.version),
  ],
);
export const storeProducts = pgTable("store_products", {
  id: id(),
  componentKey: text("component_key")
    .notNull()
    .unique()
    .references(() => componentDefinitions.key),
  price: integer("price").notNull(),
  createdAt: created(),
});
export const entitlements = pgTable(
  "merchant_entitlements",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    componentKey: text("component_key")
      .notNull()
      .references(() => componentDefinitions.key),
    source: text("source").notNull().default("demo"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("entitlement_unique").on(t.merchantId, t.componentKey)],
);
export const categories = pgTable(
  "menu_categories",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("category_tenant_id").on(t.merchantId, t.id),
    index("category_merchant").on(t.merchantId),
  ],
);
export const products = pgTable(
  "menu_products",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    image: text("image").notNull().default(""),
    available: boolean("available").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: created(),
    updatedAt: created(),
  },
  (t) => [
    index("product_merchant").on(t.merchantId),
    foreignKey({
      columns: [t.merchantId, t.categoryId],
      foreignColumns: [categories.merchantId, categories.id],
      name: "product_category_tenant_fk",
    }),
  ],
);
export const media = pgTable(
  "media_assets",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    path: text("path").notNull().unique(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    createdAt: created(),
  },
  (t) => [index("media_merchant").on(t.merchantId)],
);
export const revisions = pgTable(
  "website_revisions",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    sections: jsonb("sections").$type<Section[]>().notNull(),
    createdAt: created(),
  },
  (t) => [
    index("revision_merchant_page").on(t.merchantId, t.pageId),
    foreignKey({
      columns: [t.merchantId, t.pageId],
      foreignColumns: [pages.merchantId, pages.id],
      name: "revision_page_tenant_fk",
    }).onDelete("cascade"),
  ],
);
export const pageSections = pgTable(
  "page_sections",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    componentKey: text("component_key")
      .notNull()
      .references(() => componentDefinitions.key),
    version: integer("version").notNull(),
    position: integer("position").notNull(),
    visible: boolean("visible").notNull(),
    settings: jsonb("settings").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("section_merchant_page").on(t.merchantId, t.pageId),
    foreignKey({
      columns: [t.merchantId, t.pageId],
      foreignColumns: [pages.merchantId, pages.id],
      name: "section_page_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.componentKey, t.version],
      foreignColumns: [
        componentVersions.componentKey,
        componentVersions.version,
      ],
      name: "section_registered_version_fk",
    }),
  ],
);
