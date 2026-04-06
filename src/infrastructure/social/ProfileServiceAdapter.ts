import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { IProfileService } from "@/core/domain/ports/IProfileService";
import type { UserInsight, PlatformType } from "@/core/domain/entities/UserInsight";
import { MALAdapter } from "./MALAdapter";
import { RedditAdapter } from "./RedditAdapter";

export class ProfileServiceAdapter implements IProfileService {
  private malAdapter = new MALAdapter();
  private redditAdapter = new RedditAdapter();

  async fetchProfile(
    username: string,
    platform: PlatformType
  ): Promise<UserInsight> {
    if (platform === "mal") {
      return this.malAdapter.fetchProfile(username);
    }
    return this.redditAdapter.fetchProfile(username);
  }

  async extractInterestTags(profile: UserInsight): Promise<string[]> {
    try {
      const label =
        profile.platform === "mal" ? "MyAnimeList" : "Reddit";

      const { text } = await generateText({
        model: google(process.env.GEMINI_MODEL || ""),
        prompt: `Analiza este perfil de usuario de ${label} y genera 5-8 tags de interés para recomendaciones de manga. Los tags deben ser en español, descriptivos y cortos (2-3 palabras cada uno).

Datos del perfil:
- Username: ${profile.username}
- Bio: ${profile.bio ?? "No disponible"}
- Géneros favoritos: ${profile.favoriteGenres.join(", ") || "No disponible"}
- Datos adicionales: ${JSON.stringify(profile.rawData ?? {})}

Retorna SOLO un JSON array de strings, sin explicación. Ejemplo: ["Shonen clásico", "Dark fantasy", "Romance slice-of-life"]`,
      });

      const parsed = JSON.parse(
        text.replace(/```json?\n?|\n?```/g, "").trim()
      );
      if (Array.isArray(parsed)) return parsed.slice(0, 8);
      return [];
    } catch {
      return [];
    }
  }
}
