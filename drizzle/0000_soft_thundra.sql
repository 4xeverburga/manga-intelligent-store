CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
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
CREATE UNIQUE INDEX "mangas_jikan_id_idx" ON "mangas" USING btree ("jikan_id");--> statement-breakpoint
CREATE INDEX "mangas_genres_idx" ON "mangas" USING btree ("genres");