import { describe, it, expect } from "vitest";
import { ProfileServiceAdapter } from "@/infrastructure/social/ProfileServiceAdapter";
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
        if (rd.mangaList && (rd.mangaList as string[]).length > 0)
          section += `\n- Lista de manga: ${(rd.mangaList as string[]).join(", ")}`;
        if (rd.animeList && (rd.animeList as string[]).length > 0)
          section += `\n- Lista de anime: ${(rd.animeList as string[]).join(", ")}`;
        if (rd.readingManga && (rd.readingManga as string[]).length > 0)
          section += `\n- Leyendo ahora: ${(rd.readingManga as string[]).join(", ")}`;
        if (rd.watchingAnime && (rd.watchingAnime as string[]).length > 0)
          section += `\n- Viendo ahora: ${(rd.watchingAnime as string[]).join(", ")}`;
        if (rd.stats) {
          const s = rd.stats as Record<string, Record<string, number>>;
          if (s.anime?.total_entries > 0)
            section += `\n- Estadísticas anime: ${s.anime.total_entries} títulos, score promedio ${s.anime.mean_score}`;
          if (s.manga?.total_entries > 0)
            section += `\n- Estadísticas manga: ${s.manga.total_entries} títulos, score promedio ${s.manga.mean_score}`;
        }
        if (rd.listsPrivate)
          section += `\n- ⚠️ Listas configuradas como privadas en MAL (datos limitados)`;
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

  const tags = profileContext.interestTags.join(", ");
  const genres = profileContext.favoriteGenres.join(", ");

  let result = `## Perfil del usuario\n${platformSections.join("\n\n")}`;

  result += `\n\n### Resumen general`;
  if (tags || genres) {
    if (tags) result += `\n- Intereses IA: ${tags}`;
    if (genres) result += `\n- Géneros favoritos: ${genres}`;
  } else {
    result += `\n- No se pudo extraer preferencias en base a los datos de los perfiles. Basa tus recomendaciones en lo que el usuario te pida durante la conversación.`;
  }

  return result;
}

describe("Profile extraction — what Gemini actually sees", () => {
  let malProfile: UserInsight;
  let redditProfile: UserInsight;

  it("Step 1: fetch raw profiles from MAL + Reddit APIs", async () => {
    const service = new ProfileServiceAdapter();

    const [mal, reddit] = await Promise.all([
      service.fetchProfile(malUsername, "mal"),
      service.fetchProfile(redditUsername, "reddit"),
    ]);
    malProfile = mal;
    redditProfile = reddit;

    expect(malProfile.username).toBe(malUsername);
    expect(redditProfile.username).toBe(redditUsername);

    console.log("\n" + "=".repeat(60));
    console.log("MAL — Raw UserInsight");
    console.log("=".repeat(60));
    console.log(JSON.stringify(malProfile, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("Reddit — Raw UserInsight");
    console.log("=".repeat(60));
    console.log(JSON.stringify(redditProfile, null, 2));
  });

  it("Step 2: AI-generated interest tags (what the sidebar badges show)", async () => {
    const service = new ProfileServiceAdapter();

    const [malTags, redditTags] = await Promise.all([
      service.extractInterestTags(malProfile),
      service.extractInterestTags(redditProfile),
    ]);
    malProfile.interestTags = malTags;
    redditProfile.interestTags = redditTags;

    console.log("\n" + "=".repeat(60));
    console.log("AI-GENERATED TAGS (shown as badges in sidebar)");
    console.log("=".repeat(60));
    console.log(`MAL (${malUsername}):`, malTags);
    console.log(`Reddit (${redditUsername}):`, redditTags);

    expect(malTags).toBeInstanceOf(Array);
    expect(redditTags).toBeInstanceOf(Array);
  }, 60_000);

  it("Step 3: final system prompt section Gemini receives", async () => {
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
