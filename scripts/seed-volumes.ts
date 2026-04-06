import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/infrastructure/db/schema";
import { mangas, mangaVolumes } from "../src/infrastructure/db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Constants ────────────────────────────────────────
const JIKAN_DELAY_MS = 350; // stay under Jikan rate limit
const MAX_VOLUMES_SYNTH = 10; // fallback when no volume count from API

const EDITORS = [
  "Ivrea Argentina",
  "Ivrea España",
  "Panini Manga",
  "Norma Editorial",
  "Editorial Planeta",
  "ECC Ediciones",
  "Distrito Manga",
];

// ── Jikan fetch ──────────────────────────────────────
interface JikanMangaBasic {
  mal_id: number;
  volumes: number | null;
  published: {
    prop: {
      from: { year: number | null };
    };
  };
  relations: {
    relation: string;
    entry: { mal_id: number; type: string; name: string }[];
  }[];
}

async function fetchJikanManga(
  malId: number,
  retries = 3
): Promise<JikanMangaBasic | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/manga/${malId}/full`);
      if (res.status === 429) {
        console.warn(`    ⏳ Rate limited, waiting ${attempt * 2}s...`);
        await sleep(attempt * 2000);
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as JikanMangaBasic;
    } catch {
      if (attempt === retries) return null;
      await sleep(attempt * 1000);
    }
  }
  return null;
}

// ── Synth helpers ────────────────────────────────────
function randomEditor(): string {
  return EDITORS[Math.floor(Math.random() * EDITORS.length)];
}

function synthIsbn(): string {
  // Generate a plausible ISBN-13 (978-prefix)
  const group = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  const publisher = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  const title = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  const base = `978${group}${publisher}${title}`;
  // Compute check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base}${check}`;
}

function synthEditionYear(startYear: number | null, volIdx: number): number {
  const base = startYear ?? 2015;
  // ~2 volumes per year
  return base + Math.floor(volIdx / 2);
}

// ── Main ─────────────────────────────────────────────
async function main() {
  console.log("Fetching all mangas...");
  const allMangas = await db
    .select({
      id: mangas.id,
      jikanId: mangas.jikanId,
      title: mangas.title,
      imageUrl: mangas.imageUrl,
    })
    .from(mangas);

  console.log(`Found ${allMangas.length} mangas. Seeding volumes...\n`);

  let totalVolumes = 0;
  let crossovers = 0;

  for (let idx = 0; idx < allMangas.length; idx++) {
    const manga = allMangas[idx];
    console.log(
      `[${idx + 1}/${allMangas.length}] ${manga.title} (jikan=${manga.jikanId})`
    );

    // Fetch from Jikan
    const jData = await fetchJikanManga(manga.jikanId);
    await sleep(JIKAN_DELAY_MS);

    const volumeCount = Math.min(
      jData?.volumes ?? Math.floor(Math.random() * 8) + 3,
      MAX_VOLUMES_SYNTH
    );

    const startYear =
      jData?.published?.prop?.from?.year ?? null;
    const editor = randomEditor();

    // Generate volumes for this series
    const volumeRows: (typeof mangaVolumes.$inferInsert)[] = [];

    for (let v = 1; v <= volumeCount; v++) {
      volumeRows.push({
        mangaId: manga.id,
        volumeNumber: v,
        title: `${manga.title} Vol. ${v}`,
        isbn: synthIsbn(),
        coverUrl: manga.imageUrl, // reuse series cover
        editor,
        editionYear: synthEditionYear(startYear, v - 1),
        isCrossover: false,
      });
    }

    // Check for manga-type crossover relations (Side Story, Spin-off, Other)
    const crossoverRelations = ["Side Story", "Spin-off", "Other"];
    if (jData?.relations) {
      for (const rel of jData.relations) {
        if (
          crossoverRelations.includes(rel.relation) &&
          rel.entry.some((e) => e.type === "manga")
        ) {
          for (const entry of rel.entry.filter((e) => e.type === "manga")) {
            // Only add if this crossover's MAL ID is in our catalogue
            const existsInCatalogue = allMangas.some(
              (m) => m.jikanId === entry.mal_id
            );
            if (existsInCatalogue) {
              // The crossover volume points to the same mangaId
              // (the FK relationship links it to the parent series)
              volumeRows.push({
                mangaId: manga.id,
                volumeNumber: null,
                title: entry.name,
                isbn: synthIsbn(),
                coverUrl: manga.imageUrl,
                editor,
                editionYear: synthEditionYear(startYear, volumeCount),
                isCrossover: true,
              });
              crossovers++;
            }
          }
        }
      }
    }

    // Batch insert
    if (volumeRows.length > 0) {
      await db.insert(mangaVolumes).values(volumeRows).onConflictDoNothing();
      totalVolumes += volumeRows.length;
    }

    if ((idx + 1) % 50 === 0) {
      console.log(`  ── Progress: ${totalVolumes} volumes so far ──`);
    }
  }

  console.log(`\n✅ Done! Created ${totalVolumes} volumes (${crossovers} crossovers).`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
