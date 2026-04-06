import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/infrastructure/db/schema";
import { mangas, inventory } from "../src/infrastructure/db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  console.log("Fetching all mangas...");
  const allMangas = await db.select({ id: mangas.id }).from(mangas);
  console.log(`Found ${allMangas.length} mangas. Creating inventory rows...`);

  const rows = allMangas.map((m) => ({
    mangaId: m.id,
    stock: Math.floor(Math.random() * 5), // 0-4
    canBeDropshipped: Math.random() < 0.5,
    dropshippingNotes: null as string | null,
  }));

  // Batch insert in chunks of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db
      .insert(inventory)
      .values(chunk)
      .onConflictDoNothing({ target: inventory.mangaId });
    inserted += chunk.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  console.log("Done! Inventory seeded.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
