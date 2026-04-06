CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manga_id" uuid NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"can_be_dropshipped" boolean DEFAULT false NOT NULL,
	"dropshipping_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_manga_id_unique" UNIQUE("manga_id")
);
--> statement-breakpoint
ALTER TABLE "mangas" ALTER COLUMN "embedding" SET DATA TYPE vector(3072);--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_manga_id_mangas_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."mangas"("id") ON DELETE cascade ON UPDATE no action;