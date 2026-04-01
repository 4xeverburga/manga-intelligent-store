export interface UserInsight {
  username: string;
  platform: "reddit" | "mal";
  avatarUrl?: string;
  bio?: string;
  favoriteGenres: string[];
  interestTags: string[];
  rawData?: Record<string, unknown>;
  syncedAt: Date;
}
