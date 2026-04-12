import type { UserInsight } from "@/core/domain/entities/UserInsight";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const MAL_API_BASE = "https://api.myanimelist.net/v2";

export class MALAdapter {
  /**
   * Fetch profile using the official MAL API v2 (requires OAuth2 access token).
   * Returns richer data including private lists.
   */
  async fetchProfileWithToken(accessToken: string): Promise<UserInsight> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [userRes, animeListRes, mangaListRes] = await Promise.allSettled([
      fetch(
        `${MAL_API_BASE}/users/@me?fields=anime_statistics,manga_statistics`,
        { headers }
      ),
      fetch(
        `${MAL_API_BASE}/users/@me/animelist?fields=list_status{score,status}&sort=list_score&limit=100`,
        { headers }
      ),
      fetch(
        `${MAL_API_BASE}/users/@me/mangalist?fields=list_status{score,status}&sort=list_score&limit=100`,
        { headers }
      ),
    ]);

    if (userRes.status === "rejected" || !userRes.value.ok) {
      const status =
        userRes.status === "fulfilled" ? userRes.value.status : 0;
      if (status === 401)
        throw new Error("MAL token expirado (401). Requiere refresh.");
      throw new Error(`Error al obtener perfil de MAL (HTTP ${status})`);
    }

    const user = await userRes.value.json();
    const username = user.name;
    const avatarUrl = user.picture;

    // Anime list
    let animeList: string[] = [];
    if (animeListRes.status === "fulfilled" && animeListRes.value.ok) {
      const data = await animeListRes.value.json();
      animeList = (data?.data ?? [])
        .map(
          (e: { node?: { title?: string } }) => e.node?.title
        )
        .filter(Boolean);
    }

    // Manga list
    let mangaList: string[] = [];
    if (mangaListRes.status === "fulfilled" && mangaListRes.value.ok) {
      const data = await mangaListRes.value.json();
      mangaList = (data?.data ?? [])
        .map(
          (e: { node?: { title?: string } }) => e.node?.title
        )
        .filter(Boolean);
    }

    // Stats from the user profile response
    const animeStats = user.anime_statistics;
    const mangaStats = user.manga_statistics;
    const stats: Record<string, Record<string, number>> = {};
    if (animeStats) {
      stats.anime = {
        total_entries:
          animeStats.num_items ?? animeStats.num_items_completed ?? 0,
        mean_score: animeStats.mean_score ?? 0,
        episodes_watched: animeStats.num_episodes ?? 0,
        completed: animeStats.num_items_completed ?? 0,
      };
    }
    if (mangaStats) {
      stats.manga = {
        total_entries:
          mangaStats.num_items ?? mangaStats.num_items_completed ?? 0,
        mean_score: mangaStats.mean_score ?? 0,
        chapters_read: mangaStats.num_chapters_read ?? 0,
        completed: mangaStats.num_items_completed ?? 0,
      };
    }

    return {
      username,
      platform: "mal",
      avatarUrl,
      favoriteGenres: [],
      interestTags: [],
      rawData: {
        favoriteManga: [],
        favoriteAnime: [],
        mangaList,
        animeList,
        stats: Object.keys(stats).length > 0 ? stats : undefined,
        listsPrivate: false, // OAuth always has access
        source: "oauth",
      },
      syncedAt: new Date(),
    };
  }

  /** Fetch profile using Jikan public API (no auth required, limited by privacy settings) */
  async fetchProfile(username: string): Promise<UserInsight> {
    const encoded = encodeURIComponent(username);
    const [profileRes, favoritesRes, mangaListRes, animeListRes, statsRes] =
      await Promise.allSettled([
        fetch(`${JIKAN_BASE}/users/${encoded}`),
        fetch(`${JIKAN_BASE}/users/${encoded}/favorites`),
        fetch(`${JIKAN_BASE}/users/${encoded}/mangalist?order_by=score&sort=desc&limit=25`),
        fetch(`${JIKAN_BASE}/users/${encoded}/animelist?order_by=score&sort=desc&limit=25`),
        fetch(`${JIKAN_BASE}/users/${encoded}/statistics`),
      ]);

    if (profileRes.status === "rejected" || !profileRes.value.ok) {
      if (profileRes.status === "rejected") {
        console.error(
          `[MAL] Profile fetch rejected for "${username}":`,
          profileRes.reason
        );
        throw new Error("No se pudo conectar con MyAnimeList");
      }

      const { status, statusText } = profileRes.value;
      let body = "";
      try {
        body = await profileRes.value.text();
      } catch {}

      console.error(
        `[MAL] Profile fetch failed for "${username}": ${status} ${statusText}`,
        body.slice(0, 300)
      );

      if (status === 404)
        throw new Error("Usuario no encontrado en MyAnimeList");
      if (status === 429)
        throw new Error("MAL rate-limit alcanzado. Intenta en unos segundos.");
      throw new Error(
        `No se pudo conectar con MyAnimeList (HTTP ${status})`
      );
    }

    const profileData = await profileRes.value.json();
    const profile = profileData.data;

    const avatarUrl =
      profile?.images?.jpg?.image_url ?? profile?.images?.webp?.image_url;
    const bio = profile?.about?.slice(0, 500) ?? undefined;

    // Favorite manga titles
    let favMangaTitles: string[] = [];
    let favAnimeTitles: string[] = [];
    if (favoritesRes.status === "fulfilled" && favoritesRes.value.ok) {
      const favData = await favoritesRes.value.json();
      favMangaTitles = (favData?.data?.manga ?? [])
        .map((m: { title?: string }) => m.title)
        .filter(Boolean);
      favAnimeTitles = (favData?.data?.anime ?? [])
        .map((a: { title?: string }) => a.title)
        .filter(Boolean);
    }

    // Manga list (all statuses, sorted by score)
    let mangaList: string[] = [];
    let mangaListPrivate = false;
    if (mangaListRes.status === "fulfilled") {
      if (mangaListRes.value.ok) {
        const mangaData = await mangaListRes.value.json();
        mangaList = (mangaData?.data ?? [])
          .map((e: { manga?: { title?: string } }) => e.manga?.title)
          .filter(Boolean);
      } else if (mangaListRes.value.status === 404) {
        mangaListPrivate = true;
      }
    }

    // Anime list (all statuses, sorted by score)
    let animeList: string[] = [];
    let animeListPrivate = false;
    if (animeListRes.status === "fulfilled") {
      if (animeListRes.value.ok) {
        const animeData = await animeListRes.value.json();
        animeList = (animeData?.data ?? [])
          .map((e: { anime?: { title?: string } }) => e.anime?.title)
          .filter(Boolean);
      } else if (animeListRes.value.status === 404) {
        animeListPrivate = true;
      }
    }

    // Statistics (always public, useful fallback when lists are private)
    let stats: Record<string, unknown> | undefined;
    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const statsData = await statsRes.value.json();
      stats = statsData?.data;
    }

    return {
      username,
      platform: "mal",
      avatarUrl,
      bio,
      favoriteGenres: [],
      interestTags: [],
      rawData: {
        favoriteManga: favMangaTitles,
        favoriteAnime: favAnimeTitles,
        mangaList,
        animeList,
        stats,
        listsPrivate: mangaListPrivate || animeListPrivate,
      },
      syncedAt: new Date(),
    };
  }
}
