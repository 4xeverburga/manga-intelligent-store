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

    // Fetch posts and comments in parallel
    const [postsRes, commentsRes] = await Promise.allSettled([
      fetch(`${REDDIT_BASE}/user/${encodeURIComponent(username)}/submitted.json?limit=50`, { headers }),
      fetch(`${REDDIT_BASE}/user/${encodeURIComponent(username)}/comments.json?limit=50`, { headers }),
    ]);

    // Extract subreddit activity from posts
    let subredditActivity: string[] = [];
    let postTitles: string[] = [];
    if (postsRes.status === "fulfilled" && postsRes.value.ok) {
      const postsData = await postsRes.value.json();
      const posts = postsData?.data?.children ?? [];
      const subs = posts
        .map((p: { data?: { subreddit?: string } }) =>
          p.data?.subreddit?.toLowerCase()
        )
        .filter(Boolean);
      subredditActivity = [...new Set(subs)] as string[];
      postTitles = posts
        .map((p: { data?: { title?: string; subreddit?: string } }) => {
          const sub = p.data?.subreddit?.toLowerCase();
          if (sub && MANGA_SUBREDDITS.has(sub)) return p.data?.title;
          return null;
        })
        .filter(Boolean) as string[];
    }

    // Extract subreddits from comments
    let commentSubreddits: string[] = [];
    if (commentsRes.status === "fulfilled" && commentsRes.value.ok) {
      const commentsData = await commentsRes.value.json();
      const comments = commentsData?.data?.children ?? [];
      const subs = comments
        .map((c: { data?: { subreddit?: string } }) =>
          c.data?.subreddit?.toLowerCase()
        )
        .filter(Boolean);
      commentSubreddits = [...new Set(subs)] as string[];
    }

    const allSubreddits = [...new Set([...subredditActivity, ...commentSubreddits])];
    const mangaRelated = allSubreddits.filter((s) =>
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
        subreddits: allSubreddits.slice(0, 25),
        mangaSubreddits: mangaRelated,
        mangaPostTitles: postTitles.slice(0, 15),
      },
      syncedAt: new Date(),
    };
  }
}
