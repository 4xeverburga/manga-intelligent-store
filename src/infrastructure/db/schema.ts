import {
  pgTable,
  uuid,
  integer,
  text,
  real,
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
