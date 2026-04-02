export type PlatformType = "reddit" | "mal";

export interface UserInsight {
  username: string;
  platform: PlatformType;
  avatarUrl?: string;
  bio?: string;
  favoriteGenres: string[];
  interestTags: string[];
  rawData?: Record<string, unknown>;
  syncedAt: Date;
}
