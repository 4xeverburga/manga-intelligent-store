import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { MALAdapter } from "@/infrastructure/social/MALAdapter";
import { RedditAdapter } from "@/infrastructure/social/RedditAdapter";
import type { UserInsight } from "@/core/domain/entities/UserInsight";

const inputSchema = z.object({
  username: z.string().min(1).max(100),
  platform: z.enum(["reddit", "mal"]),
});

async function generateInterestTags(profile: UserInsight): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
      prompt: `Analiza este perfil de usuario de ${profile.platform === "mal" ? "MyAnimeList" : "Reddit"} y genera 5-8 tags de interés para recomendaciones de manga. Los tags deben ser en español, descriptivos y cortos (2-3 palabras cada uno).

Datos del perfil:
- Username: ${profile.username}
- Bio: ${profile.bio ?? "No disponible"}
- Géneros favoritos: ${profile.favoriteGenres.join(", ") || "No disponible"}
- Datos adicionales: ${JSON.stringify(profile.rawData ?? {})}

Retorna SOLO un JSON array de strings, sin explicación. Ejemplo: ["Shonen clásico", "Dark fantasy", "Romance slice-of-life"]`,
    });

    const parsed = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim());
    if (Array.isArray(parsed)) return parsed.slice(0, 8);
    return [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = inputSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Username y plataforma son requeridos" },
      { status: 400 }
    );
  }

  const { username, platform } = result.data;

  try {
    let profile: UserInsight;

    if (platform === "mal") {
      const adapter = new MALAdapter();
      profile = await adapter.fetchProfile(username);
    } else {
      const adapter = new RedditAdapter();
      profile = await adapter.fetchProfile(username);
    }

    // Generate AI interest tags
    const tags = await generateInterestTags(profile);
    profile.interestTags = tags;

    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener perfil";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
