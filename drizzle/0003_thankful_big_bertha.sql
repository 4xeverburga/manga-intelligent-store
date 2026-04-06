-- Truncate inventory before schema change (will be re-seeded)
TRUNCATE TABLE "inventory";
--> statement-breakpoint
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_manga_id_unique";--> statement-breakpoint
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_manga_id_mangas_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "volume_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "manga_volumes" ADD CONSTRAINT "manga_volumes_manga_id_mangas_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."mangas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manga_volumes_manga_id_idx" ON "manga_volumes" USING btree ("manga_id");--> statement-breakpoint
CREATE INDEX "manga_volumes_isbn_idx" ON "manga_volumes" USING btree ("isbn");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_volume_id_manga_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."manga_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" DROP COLUMN "manga_id";--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_volume_id_unique" UNIQUE("volume_id");