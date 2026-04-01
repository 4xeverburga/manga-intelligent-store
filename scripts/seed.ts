import { config } from "dotenv";
config({ path: ".env.local" });
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/infrastructure/db/schema";
import { mangas } from "../src/infrastructure/db/schema";

// ── Config ─────────────────────────────────────────────
const JIKAN_BASE = "https://api.jikan.moe/v4/top/manga";
const TARGET_COUNT = 500;
const PAGE_SIZE = 25;
const JIKAN_DELAY_MS = 400;
const EMBEDDING_BATCH_SIZE = 8;

// ── DB ────────────────────────────────────────────────
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

// ── Helpers ───────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanSynopsis(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/\[Written by MAL Rewrite\]/gi, "").trim();
}

interface JikanManga {
  mal_id: number;
  title: string;
  synopsis: string | null;
  genres: { name: string }[];
  demographics: { name: string }[];
  images: { jpg: { large_image_url: string } };
  score: number | null;
  popularity: number | null;
}

interface JikanPage {
  data: JikanManga[];
  pagination: { has_next_page: boolean };
}

async function fetchPage(page: number, retries = 3): Promise<JikanPage> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${JIKAN_BASE}?page=${page}`);
      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`  ⏳ Rate limited, waiting ${attempt * 2}s...`);
          await sleep(attempt * 2000);
          continue;
        }
        throw new Error(`Jikan HTTP ${res.status}`);
      }
      return (await res.json()) as JikanPage;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Retry ${attempt}/${retries} for page ${page}`);
      await sleep(attempt * 1000);
    }
  }
  throw new Error("Unreachable");
}

async function generateEmbedding(
  text: string,
  retries = 3
): Promise<number[] | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { embedding: values } = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text,
      });
      return values;
    } catch (err) {
      if (attempt === retries) {
        console.error(`  ❌ Embedding failed after ${retries} retries:`, err);
        return null;
      }
      console.warn(`  ⚠ Embedding retry ${attempt}/${retries}`);
      await sleep(attempt * 1500);
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────
async function seed() {
  const startTime = Date.now();

  let page = 1;
  let pagesRead = 0;
  let totalProcessed = 0;
  let validCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let discardedCount = 0;
  let embeddingErrors = 0;

  // Count existing records to know if we insert or update
  const existingCountResult = await db
    .select({ count: schema.mangas.id })
    .from(schema.mangas);
  const existingIds = new Set<number>();
  const allExisting = await db.select({ jikanId: schema.mangas.jikanId }).from(schema.mangas);
  allExisting.forEach((r) => existingIds.add(r.jikanId));

  console.log(`\n🚀 Starting seed — Target: ${TARGET_COUNT} mangas`);
  console.log(`   Existing records: ${existingIds.size}\n`);

  while (validCount < TARGET_COUNT) {
    console.log(`📄 Fetching page ${page}...`);

    const pageData = await fetchPage(page);
    pagesRead++;

    if (!pageData.data.length) {
      console.warn("   No more data from Jikan.");
      break;
    }

    // Prepare valid mangas from this page
    const pageMangasValid: {
      jikanId: number;
      title: string;
      synopsis: string;
      genres: string[];
      imageUrl: string;
      score: number;
      popularity: number;
    }[] = [];

    for (const item of pageData.data) {
      totalProcessed++;
      const synopsis = cleanSynopsis(item.synopsis);

      if (!synopsis) {
        discardedCount++;
        continue;
      }

      const allGenres = [
        ...item.genres.map((g) => g.name),
        ...item.demographics.map((d) => d.name),
      ];

      pageMangasValid.push({
        jikanId: item.mal_id,
        title: item.title,
        synopsis,
        genres: allGenres,
        imageUrl: item.images.jpg.large_image_url,
        score: item.score ?? 0,
        popularity: item.popularity ?? 0,
      });
    }

    // Generate embeddings in batches
    for (let i = 0; i < pageMangasValid.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = pageMangasValid.slice(i, i + EMBEDDING_BATCH_SIZE);

      const embeddings = await Promise.all(
        batch.map((m) =>
          generateEmbedding(
            `${m.title} — ${m.synopsis} Genres: ${m.genres.join(", ")}`
          )
        )
      );

      // Upsert each manga
      for (let j = 0; j < batch.length; j++) {
        if (validCount >= TARGET_COUNT) break;

        const manga = batch[j];
        const embedding = embeddings[j];

        if (!embedding) {
          embeddingErrors++;
        }

        const isExisting = existingIds.has(manga.jikanId);

        await db
          .insert(mangas)
          .values({
            jikanId: manga.jikanId,
            title: manga.title,
            synopsis: manga.synopsis,
            genres: manga.genres,
            imageUrl: manga.imageUrl,
            score: manga.score,
            popularity: manga.popularity,
            embedding: embedding,
          })
          .onConflictDoUpdate({
            target: mangas.jikanId,
            set: {
              title: manga.title,
              synopsis: manga.synopsis,
              genres: manga.genres,
              imageUrl: manga.imageUrl,
              score: manga.score,
              popularity: manga.popularity,
              embedding: embedding,
              updatedAt: new Date(),
            },
          });

        if (isExisting) {
          updatedCount++;
        } else {
          insertedCount++;
          existingIds.add(manga.jikanId);
        }

        validCount++;
      }

      // Small delay between embedding batches
      if (i + EMBEDDING_BATCH_SIZE < pageMangasValid.length) {
        await sleep(200);
      }
    }

    console.log(
      `   ✅ Page ${page}: ${pageMangasValid.length} valid | Running total: ${validCount}/${TARGET_COUNT}`
    );

    if (!pageData.pagination.has_next_page) {
      console.warn("   No more pages available.");
      break;
    }

    page++;
    await sleep(JIKAN_DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const minutes = Math.floor(Number(elapsed) / 60);
  const seconds = (Number(elapsed) % 60).toFixed(0);

  console.log(`
📊 Seed completado:
   Páginas leídas: ${pagesRead}
   Mangas procesados: ${totalProcessed}
   Mangas válidos (con synopsis): ${validCount}
   Insertados nuevos: ${insertedCount}
   Actualizados: ${updatedCount}
   Descartados (sin synopsis): ${discardedCount}
   Errores de embedding: ${embeddingErrors}
   Tiempo total: ${minutes}m ${seconds}s
`);

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("💥 Seed failed:", err);
  process.exit(1);
});
