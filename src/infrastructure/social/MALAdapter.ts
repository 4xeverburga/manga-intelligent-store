import type { UserInsight } from "@/core/domain/entities/UserInsight";

const JIKAN_BASE = "https://api.jikan.moe/v4";

export class MALAdapter {
  async fetchProfile(username: string): Promise<UserInsight> {
    const [profileRes, favoritesRes] = await Promise.allSettled([
      fetch(`${JIKAN_BASE}/users/${encodeURIComponent(username)}`),
      fetch(`${JIKAN_BASE}/users/${encodeURIComponent(username)}/favorites`),
    ]);

    if (profileRes.status === "rejected" || !profileRes.value.ok) {
      const status =
        profileRes.status === "fulfilled"
          ? profileRes.value.status
          : 0;
      if (status === 404) throw new Error("Usuario no encontrado en MyAnimeList");
      throw new Error("No se pudo conectar con MyAnimeList");
    }

    const profileData = await profileRes.value.json();
    const profile = profileData.data;

    const avatarUrl =
      profile?.images?.jpg?.image_url ?? profile?.images?.webp?.image_url;
    const bio = profile?.about?.slice(0, 500) ?? undefined;

    // Extract favorite genres from favorites
    const genres: string[] = [];
    let favMangaTitles: string[] = [];
    if (favoritesRes.status === "fulfilled" && favoritesRes.value.ok) {
      const favData = await favoritesRes.value.json();
      const favMangas = favData?.data?.manga ?? [];
      favMangaTitles = favMangas.map((m: { title?: string }) => m.title).filter(Boolean);
    }

    return {
      username,
      platform: "mal",
      avatarUrl,
      bio,
      favoriteGenres: genres.slice(0, 10),
      interestTags: [], // Generated later by AI
      rawData: {
        favoriteMangaTitles: favMangaTitles,
      },
      syncedAt: new Date(),
    };
  }
}
