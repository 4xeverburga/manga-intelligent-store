import type { UserInsight } from "@/core/domain/entities/UserInsight";

const REDDIT_BASE = "https://www.reddit.com";
const MANGA_SUBREDDITS = new Set([
  "manga", "anime", "animesuggest", "manhwa", "manhua",
  "onepiece", "naruto", "bleach", "berserk", "chainsawman",
  "jujutsukaisenba", "hunterxhunter", "vinlandsaga", "demonslayer",
]);

export class RedditAdapter {
  async fetchProfile(username: string): Promise<UserInsight> {
    const headers = { "User-Agent": "HablemosManga/1.0" };

    const aboutRes = await fetch(
      `${REDDIT_BASE}/user/${encodeURIComponent(username)}/about.json`,
      { headers }
    );

    if (!aboutRes.ok) {
      if (aboutRes.status === 404) throw new Error("Usuario no encontrado en Reddit");
      throw new Error("No se pudo conectar con Reddit");
    }

    const aboutData = await aboutRes.json();
    const profile = aboutData.data;

    const avatarUrl =
      profile?.snoovatar_img || profile?.icon_img?.split("?")[0] || undefined;
    const bio = profile?.subreddit?.public_description?.slice(0, 500) || undefined;

    // Fetch recent posts to find manga-related activity
    let subredditActivity: string[] = [];
    try {
      const postsRes = await fetch(
        `${REDDIT_BASE}/user/${encodeURIComponent(username)}/submitted.json?limit=50`,
        { headers }
      );
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData?.data?.children ?? [];
        const subs = posts
          .map((p: { data?: { subreddit?: string } }) =>
            p.data?.subreddit?.toLowerCase()
          )
          .filter(Boolean);
        subredditActivity = [...new Set(subs)] as string[];
      }
    } catch {
      // Non-critical failure
    }

    const mangaRelated = subredditActivity.filter((s) =>
      MANGA_SUBREDDITS.has(s)
    );

    return {
      username,
      platform: "reddit",
      avatarUrl,
      bio,
      favoriteGenres: mangaRelated.slice(0, 10),
      interestTags: [],
      rawData: {
        karma: profile?.total_karma,
        subreddits: subredditActivity.slice(0, 20),
        mangaSubreddits: mangaRelated,
      },
      syncedAt: new Date(),
    };
  }
}
