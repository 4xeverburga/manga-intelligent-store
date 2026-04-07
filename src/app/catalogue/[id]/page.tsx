import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MangaDetail } from "@/app/catalogue/[id]/_components/MangaDetail";
import { VolumesList } from "@/app/catalogue/[id]/_components/VolumesList";
import { GenreCarousel } from "@/app/catalogue/[id]/_components/GenreCarousel";
import { supabase } from "@/infrastructure/db/client";

interface Props {
  params: Promise<{ id: string }>;
}

async function getManga(id: string) {
  const { data: manga } = await supabase
    .from("mangas")
    .select("id, jikan_id, title, synopsis, genres, image_url, score, popularity")
    .eq("id", id)
    .single();

  if (!manga) return null;

  return {
    id: manga.id as string,
    jikanId: manga.jikan_id as number,
    title: manga.title as string,
    synopsis: manga.synopsis as string,
    genres: manga.genres as string[],
    imageUrl: manga.image_url as string,
    score: manga.score as number | null,
    popularity: manga.popularity as number | null,
  };
}

async function getVolumes(mangaId: string) {
  const { data } = await supabase
    .from("manga_volumes")
    .select(`
      id, manga_id, volume_number, title, isbn, cover_url, editor,
      edition_year, is_crossover, price,
      inventory ( stock, can_be_dropshipped )
    `)
    .eq("manga_id", mangaId)
    .order("volume_number", { ascending: true, nullsFirst: false });

  return (data ?? []).map((v) => {
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    return {
      id: v.id as string,
      mangaId: v.manga_id as string,
      volumeNumber: v.volume_number as number | null,
      title: v.title as string,
      isbn: v.isbn as string | null,
      coverUrl: v.cover_url as string | null,
      editor: v.editor as string | null,
      editionYear: v.edition_year as number | null,
      isCrossover: v.is_crossover as boolean,
      price: (v.price as number) ?? 29.9,
      stock: (inv?.stock as number) ?? 0,
      canBeDropshipped: (inv?.can_be_dropshipped as boolean) ?? false,
    };
  });
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const manga = await getManga(id);
  if (!manga) return { title: "No encontrado" };
  return {
    title: `${manga.title} | Hablemos Manga`,
    description: manga.synopsis.slice(0, 160),
  };
}

export default async function MangaDetailPage({ params }: Props) {
  const { id } = await params;
  const manga = await getManga(id);
  if (!manga) notFound();

  const volumes = await getVolumes(manga.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <MangaDetail manga={manga} />
          <VolumesList volumes={volumes} mangaImageUrl={manga.imageUrl} />
          <GenreCarousel
            genre={manga.genres[0]}
            excludeId={manga.id}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
