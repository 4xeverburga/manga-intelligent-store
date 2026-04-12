import {
  pgTable,
  uuid,
  integer,
  text,
  real,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  customType,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 3072})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

export const mangas = pgTable(
  "mangas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jikanId: integer("jikan_id").notNull(),
    title: text("title").notNull(),
    synopsis: text("synopsis").notNull(),
    genres: text("genres").array().notNull(),
    imageUrl: text("image_url").notNull(),
    score: real("score").default(0),
    popularity: integer("popularity").default(0),
    embedding: vector("embedding", { dimensions: 3072 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("mangas_jikan_id_idx").on(table.jikanId),
    index("mangas_genres_idx").on(table.genres),
  ]
);

export type SelectManga = typeof mangas.$inferSelect;
export type InsertManga = typeof mangas.$inferInsert;

// ── Manga Volumes ────────────────────────────────────
export const mangaVolumes = pgTable(
  "manga_volumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mangaId: uuid("manga_id").references(() => mangas.id, {
      onDelete: "cascade",
    }),
    volumeNumber: integer("volume_number"),
    title: text("title").notNull(),
    isbn: text("isbn"),
    coverUrl: text("cover_url"),
    editor: text("editor"),
    editionYear: integer("edition_year"),
    isCrossover: boolean("is_crossover").notNull().default(false),
    price: real("price").notNull().default(29.9),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("manga_volumes_manga_id_idx").on(table.mangaId),
    index("manga_volumes_isbn_idx").on(table.isbn),
  ]
);

export type SelectMangaVolume = typeof mangaVolumes.$inferSelect;
export type InsertMangaVolume = typeof mangaVolumes.$inferInsert;

// ── Inventory (per volume) ───────────────────────────
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    volumeId: uuid("volume_id")
      .notNull()
      .references(() => mangaVolumes.id, { onDelete: "cascade" })
      .unique(),
    stock: integer("stock").notNull().default(0),
    canBeDropshipped: boolean("can_be_dropshipped").notNull().default(false),
    dropshippingNotes: text("dropshipping_notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [check("stock_non_negative", sql`${table.stock} >= 0`)]
);

export type SelectInventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ── Orders ───────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  niubizTransactionId: text("niubiz_transaction_id"),
  status: text("status").notNull().default("pending"),
  totalAmount: real("total_amount").notNull(),
  itemCount: integer("item_count").notNull(),
  email: text("email"),
  phone: text("phone"),
  deliveryAddress: text("delivery_address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SelectOrder = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ── Order Items ──────────────────────────────────────
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    volumeId: uuid("volume_id")
      .notNull()
      .references(() => mangaVolumes.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    reservedFromStock: integer("reserved_from_stock").notNull().default(0),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

export type SelectOrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
