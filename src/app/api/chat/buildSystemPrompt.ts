import { SYSTEM_PROMPT } from "@/infrastructure/ai/prompts";

type Platform = {
  username: string;
  platform: string;
  rawData?: Record<string, unknown>;
};

export type ProfileContext = {
  platforms?: Platform[];
  interestTags?: string[];
  favoriteGenres?: string[];
};

/**
 * Builds the full system prompt by starting with the base SYSTEM_PROMPT and
 * appending the user's social profile data when available.
 *
 * Returns just SYSTEM_PROMPT when no profile is provided (anonymous user).
 */
export function buildSystemPrompt(profileContext?: ProfileContext): string {
  if (!profileContext) return SYSTEM_PROMPT;

  let system = SYSTEM_PROMPT;

  // --- Per-platform sections (MAL, Reddit) ---
  // Each platform contributes a markdown block with lists/stats the AI can reference.
  const platformSections = (profileContext.platforms ?? []).map(
    (p: Platform) => {
      const label = p.platform === "mal" ? "MyAnimeList" : "Reddit";
      let section = `### ${p.username} (${label})`;

      if (!p.rawData) return section;
      const rd = p.rawData;

      // MAL-specific fields
      if ((rd.favoriteManga as string[] | undefined)?.length)
        section += `\n- Manga favoritos: ${(rd.favoriteManga as string[]).join(", ")}`;
      if ((rd.favoriteAnime as string[] | undefined)?.length)
        section += `\n- Anime favoritos: ${(rd.favoriteAnime as string[]).join(", ")}`;
      if ((rd.mangaList as string[] | undefined)?.length)
        section += `\n- Lista de manga: ${(rd.mangaList as string[]).join(", ")}`;
      if ((rd.animeList as string[] | undefined)?.length)
        section += `\n- Lista de anime: ${(rd.animeList as string[]).join(", ")}`;

      // Legacy MAL fields kept for cached profiles
      if ((rd.readingManga as string[] | undefined)?.length)
        section += `\n- Leyendo ahora: ${(rd.readingManga as string[]).join(", ")}`;
      if ((rd.watchingAnime as string[] | undefined)?.length)
        section += `\n- Viendo ahora: ${(rd.watchingAnime as string[]).join(", ")}`;

      // MAL stats (total titles + mean score)
      if (rd.stats) {
        const s = rd.stats as Record<string, Record<string, number>>;
        if (s.anime?.total_entries > 0)
          section += `\n- Estadísticas anime: ${s.anime.total_entries} títulos, score promedio ${s.anime.mean_score}`;
        if (s.manga?.total_entries > 0)
          section += `\n- Estadísticas manga: ${s.manga.total_entries} títulos, score promedio ${s.manga.mean_score}`;
      }

      // MAL private lists warning
      if (rd.listsPrivate)
        section += `\n- ⚠️ Listas configuradas como privadas en MAL (datos limitados)`;

      // Reddit-specific fields
      if ((rd.subreddits as string[] | undefined)?.length)
        section += `\n- Subreddits activos: ${(rd.subreddits as string[]).join(", ")}`;
      if ((rd.mangaSubreddits as string[] | undefined)?.length)
        section += `\n- Subreddits manga/anime: ${(rd.mangaSubreddits as string[]).join(", ")}`;
      if ((rd.mangaPostTitles as string[] | undefined)?.length)
        section += `\n- Posts recientes sobre manga: ${(rd.mangaPostTitles as string[]).join("; ")}`;

      return section;
    }
  );

  system += `\n\n## Perfil del usuario\n${platformSections.join("\n\n")}`;

  // --- AI-derived interest summary ---
  const tags = (profileContext.interestTags ?? []).join(", ");
  const genres = (profileContext.favoriteGenres ?? []).join(", ");

  system += `\n\n### Resumen general`;
  if (tags || genres) {
    if (tags) system += `\n- Intereses IA: ${tags}`;
    if (genres) system += `\n- Géneros favoritos: ${genres}`;
  } else {
    // No derived preferences — tell the model to rely on the conversation instead
    system += `\n- No se pudo extraer preferencias en base a los datos de los perfiles. Basa tus recomendaciones en lo que el usuario te pida durante la conversación.`;
  }

  // --- Behavioural instruction: use profile data, don't ask the user what they like ---
  system += `\n\nIMPORTANTE: Ya tienes los datos del usuario. NO le preguntes qué géneros le gustan ni cuál es su manga favorito — ya lo sabes por sus perfiles. Usa esta información directamente para personalizar recomendaciones. Cuando el usuario pregunte qué sabes de su perfil, responde con datos CONCRETOS: títulos específicos, subreddits, animes, etc. Si un campo dice "No disponible", no lo menciones.`;

  return system;
}
