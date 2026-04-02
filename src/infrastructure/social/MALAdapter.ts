import type { UserInsight } from "@/core/domain/entities/UserInsight";

const JIKAN_BASE = "https://api.jikan.moe/v4";

export class MALAdapter {
  async fetchProfile(username: string): Promise<UserInsight> {
    const encoded = encodeURIComponent(username);
    const [profileRes, favoritesRes, mangaListRes, animeListRes] =
      await Promise.allSettled([
        fetch(`${JIKAN_BASE}/users/${encoded}`),
        fetch(`${JIKAN_BASE}/users/${encoded}/favorites`),
        fetch(`${JIKAN_BASE}/users/${encoded}/mangalist?status=reading&limit=25`),
        fetch(`${JIKAN_BASE}/users/${encoded}/animelist?status=watching&limit=25`),
      ]);

    if (profileRes.status === "rejected" || !profileRes.value.ok) {
      const status =
        profileRes.status === "fulfilled" ? profileRes.value.status : 0;
      if (status === 404)
        throw new Error("Usuario no encontrado en MyAnimeList");
      throw new Error("No se pudo conectar con MyAnimeList");
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

    // Currently reading manga
    let readingManga: string[] = [];
    if (mangaListRes.status === "fulfilled" && mangaListRes.value.ok) {
      const mangaData = await mangaListRes.value.json();
      readingManga = (mangaData?.data ?? [])
        .map((e: { manga?: { title?: string } }) => e.manga?.title)
        .filter(Boolean);
    }

    // Currently watching anime
    let watchingAnime: string[] = [];
    if (animeListRes.status === "fulfilled" && animeListRes.value.ok) {
      const animeData = await animeListRes.value.json();
      watchingAnime = (animeData?.data ?? [])
        .map((e: { anime?: { title?: string } }) => e.anime?.title)
        .filter(Boolean);
    }

    // Derive genres from favorites
    const genres = [
      ...new Set([...favMangaTitles, ...favAnimeTitles].slice(0, 10)),
    ];

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
        readingManga,
        watchingAnime,
        totalTitlesKnown: genres.length,
      },
      syncedAt: new Date(),
    };
  }
}
