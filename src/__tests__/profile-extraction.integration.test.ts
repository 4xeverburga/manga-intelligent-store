import { describe, it, expect } from "vitest";
import { MALAdapter } from "@/infrastructure/social/MALAdapter";
import { RedditAdapter } from "@/infrastructure/social/RedditAdapter";
import type { UserInsight } from "@/core/domain/entities/UserInsight";

const malUsername = process.env.TEST_MAL_USERNAME || "4verburga";
const redditUsername = process.env.TEST_REDDIT_USERNAME || "Ever4_";

/**
 * Reproduces the exact profileContext → system prompt logic from
 * src/app/api/chat/route.ts so we can see what Gemini receives.
 */
function buildSystemPromptSection(profiles: UserInsight[]): string {
  const profileContext = {
    platforms: profiles.map((p) => ({
      username: p.username,
      platform: p.platform,
      rawData: p.rawData,
    })),
    interestTags: [...new Set(profiles.flatMap((p) => p.interestTags))],
    favoriteGenres: [...new Set(profiles.flatMap((p) => p.favoriteGenres))],
  };

  const platformSections = profileContext.platforms.map(
    (p: {
      username: string;
      platform: string;
      rawData?: Record<string, unknown>;
    }) => {
      const label = p.platform === "mal" ? "MyAnimeList" : "Reddit";
      let section = `### ${p.username} (${label})`;
      if (p.rawData) {
        const rd = p.rawData;
        if (rd.favoriteManga && (rd.favoriteManga as string[]).length > 0)
          section += `\n- Manga favoritos: ${(rd.favoriteManga as string[]).join(", ")}`;
        if (rd.favoriteAnime && (rd.favoriteAnime as string[]).length > 0)
          section += `\n- Anime favoritos: ${(rd.favoriteAnime as string[]).join(", ")}`;
        if (rd.readingManga && (rd.readingManga as string[]).length > 0)
          section += `\n- Leyendo ahora: ${(rd.readingManga as string[]).join(", ")}`;
        if (rd.watchingAnime && (rd.watchingAnime as string[]).length > 0)
          section += `\n- Viendo ahora: ${(rd.watchingAnime as string[]).join(", ")}`;
        if (rd.subreddits && (rd.subreddits as string[]).length > 0)
          section += `\n- Subreddits activos: ${(rd.subreddits as string[]).join(", ")}`;
        if (rd.mangaSubreddits && (rd.mangaSubreddits as string[]).length > 0)
          section += `\n- Subreddits manga/anime: ${(rd.mangaSubreddits as string[]).join(", ")}`;
        if (
          rd.mangaPostTitles &&
          (rd.mangaPostTitles as string[]).length > 0
        )
          section += `\n- Posts recientes sobre manga: ${(rd.mangaPostTitles as string[]).join("; ")}`;
      }
      return section;
    }
  );

  return `## Perfil del usuario\n${platformSections.join("\n\n")}
- Intereses IA: ${profileContext.interestTags.join(", ") || "No disponible"}
- Géneros favoritos: ${profileContext.favoriteGenres.join(", ") || "No disponible"}`;
}

describe("Profile extraction — what Gemini actually sees", () => {
  it(`MAL: fetch profile for "${malUsername}"`, async () => {
    const adapter = new MALAdapter();
    const profile = await adapter.fetchProfile(malUsername);

    expect(profile.username).toBe(malUsername);
    expect(profile.platform).toBe("mal");

    console.log("\n" + "=".repeat(60));
    console.log("MAL — Raw UserInsight");
    console.log("=".repeat(60));
    console.log(JSON.stringify(profile, null, 2));
  });

  it(`Reddit: fetch profile for "${redditUsername}"`, async () => {
    const adapter = new RedditAdapter();
    const profile = await adapter.fetchProfile(redditUsername);

    expect(profile.username).toBe(redditUsername);
    expect(profile.platform).toBe("reddit");

    console.log("\n" + "=".repeat(60));
    console.log("Reddit — Raw UserInsight");
    console.log("=".repeat(60));
    console.log(JSON.stringify(profile, null, 2));
  });

  it("Combined: build the exact system prompt section Gemini receives", async () => {
    const mal = new MALAdapter();
    const reddit = new RedditAdapter();

    const [malProfile, redditProfile] = await Promise.all([
      mal.fetchProfile(malUsername),
      reddit.fetchProfile(redditUsername),
    ]);

    const promptSection = buildSystemPromptSection([
      malProfile,
      redditProfile,
    ]);

    console.log("\n" + "=".repeat(60));
    console.log("SYSTEM PROMPT SECTION (appended to base prompt)");
    console.log("=".repeat(60));
    console.log(promptSection);
    console.log("=".repeat(60));

    expect(promptSection).toContain("## Perfil del usuario");
    expect(promptSection).toContain(malUsername);
    expect(promptSection).toContain(redditUsername);
  });
});
