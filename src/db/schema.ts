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
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Section } from "../lib/models";
import type { OrderStatus } from "../lib/order-policy";
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
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP + interval '336 hours'`)
    .notNull(),
  createdAt: created(),
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

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});
export const merchantSubscriptions = pgTable(
  "merchant_subscriptions",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .unique()
      .references(() => merchants.id),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: text("status")
      .$type<"trialing" | "active" | "past_due" | "canceled" | "expired">()
      .notNull()
      .default("trialing"),
    currentPeriodEndsAt: timestamp("current_period_ends_at", {
      withTimezone: true,
    }),
    paymentVerifiedAt: timestamp("payment_verified_at", { withTimezone: true }),
    verificationSource: text("verification_source").$type<
      "provider" | "admin"
    >(),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "subscription_status_valid",
      sql`${t.status} IN ('trialing','active','past_due','canceled','expired')`,
    ),
    check(
      "subscription_verification_source_valid",
      sql`${t.verificationSource} IS NULL OR ${t.verificationSource} IN ('provider','admin')`,
    ),
    check(
      "active_subscription_verified",
      sql`${t.status} <> 'active' OR (${t.paymentVerifiedAt} IS NOT NULL AND ${t.verificationSource} IS NOT NULL AND ${t.currentPeriodEndsAt} IS NOT NULL)`,
    ),
  ],
);
export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    kind: text("kind").notNull(),
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: created(),
  },
  (t) => [index("subscription_events_merchant").on(t.merchantId, t.createdAt)],
);
// Durable subject-ID claims deliberately survive deletion of an Auth account.
// A different email on the same authenticated account cannot obtain a new trial.
export const merchantTrialClaims = pgTable("merchant_trial_claims", {
  userId: uuid("user_id").primaryKey(),
  merchantId: uuid("merchant_id")
    .notNull()
    .references(() => merchants.id),
  claimedAt: created(),
});

export const orderCounters = pgTable("pos_order_counters", {
  merchantId: uuid("merchant_id")
    .primaryKey()
    .references(() => merchants.id),
  lastNumber: integer("last_number").notNull().default(0),
});
export const orders = pgTable(
  "pos_orders",
  {
    id: id(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    number: integer("number").notNull(),
    requestId: uuid("request_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    version: integer("version").notNull().default(0),
    fulfillment: text("fulfillment").$type<"dine_in" | "takeaway">().notNull(),
    tableLabel: text("table_label").notNull().default(""),
    note: text("note").notNull().default(""),
    total: integer("total").notNull(),
    payment: text("payment").$type<"cash" | "unpaid">().notNull(),
    cashReceived: integer("cash_received"),
    changeDue: integer("change_due").notNull().default(0),
    createdBy: uuid("created_by").notNull(),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cancelReason: text("cancel_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationAcknowledgedAt: timestamp("cancellation_acknowledged_at", {
      withTimezone: true,
    }),
    cancellationAcknowledgedBy: uuid("cancellation_acknowledged_by"),
  },
  (t) => [
    uniqueIndex("pos_order_number_unique").on(t.merchantId, t.number),
    uniqueIndex("pos_order_request_unique").on(t.merchantId, t.requestId),
    uniqueIndex("pos_order_tenant_id").on(t.merchantId, t.id),
    index("pos_order_queue").on(t.merchantId, t.status, t.createdAt),
    check(
      "pos_order_status_valid",
      sql`${t.status} IN ('pending','preparing','ready','completed','cancelled')`,
    ),
    check(
      "pos_order_fulfillment_valid",
      sql`${t.fulfillment} IN ('dine_in','takeaway')`,
    ),
    check("pos_order_payment_valid", sql`${t.payment} IN ('cash','unpaid')`),
    check(
      "pos_order_amounts_valid",
      sql`${t.total} >= 0 AND ${t.changeDue} >= 0 AND (${t.cashReceived} IS NULL OR ${t.cashReceived} >= ${t.total})`,
    ),
    check(
      "pos_order_cash_valid",
      sql`(${t.payment} = 'cash' AND ${t.cashReceived} IS NOT NULL AND ${t.changeDue} = ${t.cashReceived} - ${t.total}) OR (${t.payment} = 'unpaid' AND ${t.cashReceived} IS NULL AND ${t.changeDue} = 0)`,
    ),
    check(
      "pos_order_cancellation_valid",
      sql`(${t.status} = 'cancelled' AND ${t.cancelledAt} IS NOT NULL AND ${t.cancelReason} IS NOT NULL AND length(trim(${t.cancelReason})) >= 3) OR (${t.status} <> 'cancelled' AND ${t.cancelledAt} IS NULL AND ${t.cancelReason} IS NULL)`,
    ),
    check(
      "pos_order_version_valid",
      sql`${t.version} >= 0 AND ${t.number} > 0`,
    ),
  ],
);
export const orderItems = pgTable(
  "pos_order_items",
  {
    id: id(),
    merchantId: uuid("merchant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    // Snapshot source ID deliberately has no product FK: deleting/editing a menu
    // product must never remove or rewrite an already submitted kitchen ticket.
    productId: uuid("product_id").notNull(),
    name: text("name").notNull(),
    image: text("image").notNull().default(""),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [
    foreignKey({
      name: "pos_item_order_tenant_fk",
      columns: [t.merchantId, t.orderId],
      foreignColumns: [orders.merchantId, orders.id],
    }),
    uniqueIndex("pos_item_product_unique").on(t.orderId, t.productId),
    index("pos_item_order").on(t.merchantId, t.orderId),
    check(
      "pos_item_amounts_valid",
      sql`${t.quantity} BETWEEN 1 AND 99 AND ${t.unitPrice} BETWEEN 0 AND 10000000 AND ${t.lineTotal} = ${t.unitPrice} * ${t.quantity}`,
    ),
  ],
);
export const orderEvents = pgTable(
  "pos_order_events",
  {
    id: id(),
    merchantId: uuid("merchant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    version: integer("version").notNull(),
    kind: text("kind").notNull(),
    fromStatus: text("from_status").$type<OrderStatus>(),
    toStatus: text("to_status").$type<OrderStatus>().notNull(),
    reason: text("reason").notNull().default(""),
    actorId: uuid("actor_id").notNull(),
    createdAt: created(),
  },
  (t) => [
    foreignKey({
      name: "pos_event_order_tenant_fk",
      columns: [t.merchantId, t.orderId],
      foreignColumns: [orders.merchantId, orders.id],
    }),
    uniqueIndex("pos_event_version_unique").on(t.orderId, t.version),
    index("pos_event_order").on(t.merchantId, t.orderId),
  ],
);
