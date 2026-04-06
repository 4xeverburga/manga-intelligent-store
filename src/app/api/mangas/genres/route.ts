import { NextResponse } from "next/server";
import { SupabaseMangaRepository } from "@/infrastructure/db/DrizzleMangaRepository";
import { GetAvailableGenres } from "@/core/application/use-cases/GetAvailableGenres";

const getAvailableGenres = new GetAvailableGenres(new SupabaseMangaRepository());

export async function GET() {
  const genres = await getAvailableGenres.execute();
  return NextResponse.json(genres);
}
