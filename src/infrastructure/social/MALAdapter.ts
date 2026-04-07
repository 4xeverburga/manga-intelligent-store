import type { UserInsight } from "@/core/domain/entities/UserInsight";

const JIKAN_BASE = "https://api.jikan.moe/v4";

export class MALAdapter {
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
