import type { UserInsight, PlatformType } from "@/core/domain/entities/UserInsight";
import type { IProfileService } from "@/core/domain/ports/IProfileService";

interface Input {
  username: string;
  platform: PlatformType;
}

export class FetchUserProfile {
  constructor(private profileService: IProfileService) {}

  async execute(input: Input): Promise<UserInsight> {
    const profile = await this.profileService.fetchProfile(
      input.username,
      input.platform
    );
    const tags = await this.profileService.extractInterestTags(profile);
    profile.interestTags = tags;
    return profile;
  }
}
