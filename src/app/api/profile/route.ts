import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProfileServiceAdapter } from "@/infrastructure/social/ProfileServiceAdapter";
import { FetchUserProfile } from "@/core/application/use-cases/FetchUserProfile";

const fetchUserProfile = new FetchUserProfile(new ProfileServiceAdapter());

const inputSchema = z.object({
  username: z.string().min(1).max(100),
  platform: z.enum(["reddit", "mal"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = inputSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Username y plataforma son requeridos" },
      { status: 400 }
    );
  }

  try {
    const profile = await fetchUserProfile.execute(result.data);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("[POST /api/profile] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error al obtener perfil";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
