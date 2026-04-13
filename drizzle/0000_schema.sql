-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

-- ── mangas ───────────────────────────────────────────────────────────────────
CREATE TABLE "mangas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jikan_id" integer NOT NULL,
	"title" text NOT NULL,
	"synopsis" text NOT NULL,
	"genres" text[] NOT NULL,
	"image_url" text NOT NULL,
	"score" real DEFAULT 0,
	"popularity" integer DEFAULT 0,
	"embedding" vector(3072),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mangas_jikan_id_idx" ON "mangas" USING btree ("jikan_id");
--> statement-breakpoint
CREATE INDEX "mangas_genres_idx" ON "mangas" USING btree ("genres");
--> statement-breakpoint

-- ── manga_volumes ─────────────────────────────────────────────────────────────
CREATE TABLE "manga_volumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manga_id" uuid,
	"volume_number" integer,
	"title" text NOT NULL,
	"isbn" text,
	"cover_url" text,
	"editor" text,
	"edition_year" integer,
	"is_crossover" boolean DEFAULT false NOT NULL,
	"price" real NOT NULL DEFAULT 29.90,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manga_volumes" ADD CONSTRAINT "manga_volumes_manga_id_mangas_id_fk"
	FOREIGN KEY ("manga_id") REFERENCES "public"."mangas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "manga_volumes_manga_id_idx" ON "manga_volumes" USING btree ("manga_id");
--> statement-breakpoint
CREATE INDEX "manga_volumes_isbn_idx" ON "manga_volumes" USING btree ("isbn");
--> statement-breakpoint

-- ── inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"volume_id" uuid NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"can_be_dropshipped" boolean DEFAULT false NOT NULL,
	"dropshipping_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_volume_id_unique" UNIQUE("volume_id"),
	CONSTRAINT "stock_non_negative" CHECK ("inventory"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_volume_id_manga_volumes_id_fk"
	FOREIGN KEY ("volume_id") REFERENCES "public"."manga_volumes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS orders_purchase_number_seq START WITH 1000;

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_number" bigint NOT NULL DEFAULT nextval('orders_purchase_number_seq'),
	"niubiz_transaction_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" real NOT NULL,
	"item_count" integer NOT NULL,
	"email" text,
	"phone" text,
	"delivery_address" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_purchase_number_idx" ON "orders" USING btree ("purchase_number");
--> statement-breakpoint

-- ── order_items ───────────────────────────────────────────────────────────────
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"volume_id" uuid NOT NULL,
	"title" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"reserved_from_stock" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk"
	FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_volume_id_manga_volumes_id_fk"
	FOREIGN KEY ("volume_id") REFERENCES "public"."manga_volumes"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");
