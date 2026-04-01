import type { UserInsight } from "../entities/UserInsight";

export interface IProfileService {
  fetchProfile(
    username: string,
    platform: "reddit" | "mal"
  ): Promise<UserInsight>;
  extractInterestTags(profile: UserInsight): Promise<string[]>;
}
