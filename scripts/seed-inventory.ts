import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/infrastructure/db/schema";
import { mangaVolumes, inventory } from "../src/infrastructure/db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  console.log("Fetching all manga volumes...");
  const allVolumes = await db
    .select({ id: mangaVolumes.id })
    .from(mangaVolumes);
  console.log(
    `Found ${allVolumes.length} volumes. Creating inventory rows...`
  );

  const rows = allVolumes.map((v) => ({
    volumeId: v.id,
    stock: Math.floor(Math.random() * 5), // 0-4
    canBeDropshipped: Math.random() < 0.5,
    dropshippingNotes: null as string | null,
  }));

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db
      .insert(inventory)
      .values(chunk)
      .onConflictDoNothing({ target: inventory.volumeId });
    inserted += chunk.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  console.log("✅ Done! Inventory seeded.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
