import { describe, it, expect } from "vitest";
import { SupabaseMangaRepository } from "@/infrastructure/db/DrizzleMangaRepository";
import { FindSimilarMangas } from "@/core/application/use-cases/FindSimilarMangas";

const repo = new SupabaseMangaRepository();
const findSimilarMangas = new FindSimilarMangas(repo);

describe("FindSimilarMangas — integration", () => {
  it("should find mangas similar to Berserk", async () => {
    // Find Berserk by title search
    const candidates = await repo.searchByText("Berserk");
    const berserk = candidates.find((m) =>
      m.title.toLowerCase().includes("berserk")
    );
    expect(berserk).toBeDefined();

    console.log(`\n🔍 Source manga: "${berserk!.title}"`);
    console.log(`   Genres: ${berserk!.genres.join(", ")}`);
    console.log(`   Score: ${berserk!.score}`);
    console.log(`   Synopsis: ${berserk!.synopsis.slice(0, 150)}...`);

    // Execute the use case
    const similar = await findSimilarMangas.execute(berserk!.id);

    expect(similar.length).toBeGreaterThan(0);
    expect(similar.length).toBeLessThanOrEqual(6);

    console.log(`\n📊 Found ${similar.length} similar mangas:\n`);

    similar.forEach((m, i) => {
      console.log(
        `  ${i + 1}. "${m.title}" (similarity: ${(m.similarity * 100).toFixed(1)}%)`
      );
      console.log(`     Genres: ${m.genres.join(", ")}`);
      console.log(`     Score: ${m.score}`);
      console.log(`     Synopsis: ${m.synopsis.slice(0, 120)}...`);
      console.log("");
    });

    // Basic structural assertions
    for (const m of similar) {
      expect(m.id).toBeTruthy();
      expect(m.id).not.toBe(berserk!.id);
      expect(m.title).toBeTruthy();
      expect(m.similarity).toBeGreaterThan(0);
      expect(m.similarity).toBeLessThanOrEqual(1);
      expect(m.genres).toBeInstanceOf(Array);
    }
  });
});
