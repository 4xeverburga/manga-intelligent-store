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
} from "drizzle-orm/pg-core";

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

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  mangaId: uuid("manga_id")
    .notNull()
    .references(() => mangas.id, { onDelete: "cascade" })
    .unique(),
  stock: integer("stock").notNull().default(0),
  canBeDropshipped: boolean("can_be_dropshipped").notNull().default(false),
  dropshippingNotes: text("dropshipping_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SelectInventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
