import type { UserInsight, PlatformType } from "../entities/UserInsight";

export interface IProfileService {
  fetchProfile(
    username: string,
    platform: PlatformType
  ): Promise<UserInsight>;
  extractInterestTags(profile: UserInsight): Promise<string[]>;
}
