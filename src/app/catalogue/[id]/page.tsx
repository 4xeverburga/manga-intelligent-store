import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MangaDetail } from "./_components/MangaDetail";
import { SimilarCarousel } from "./_components/SimilarCarousel";
import { supabase } from "@/infrastructure/db/client";

interface Props {
  params: Promise<{ id: string }>;
}

async function getMangaWithInventory(id: string) {
  const { data: manga } = await supabase
    .from("mangas")
    .select("id, jikan_id, title, synopsis, genres, image_url, score, popularity")
    .eq("id", id)
    .single();

  if (!manga) return null;

  const { data: inv } = await supabase
    .from("inventory")
    .select("stock, can_be_dropshipped")
    .eq("manga_id", id)
    .single();

  return {
    id: manga.id as string,
    jikanId: manga.jikan_id as number,
    title: manga.title as string,
    synopsis: manga.synopsis as string,
    genres: manga.genres as string[],
    imageUrl: manga.image_url as string,
    score: manga.score as number | null,
    popularity: manga.popularity as number | null,
    stock: (inv?.stock as number) ?? 0,
    canBeDropshipped: (inv?.can_be_dropshipped as boolean) ?? false,
  };
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const manga = await getMangaWithInventory(id);
  if (!manga) return { title: "No encontrado" };
  return {
    title: `${manga.title} | Hablemos Manga`,
    description: manga.synopsis.slice(0, 160),
  };
}

export default async function MangaDetailPage({ params }: Props) {
  const { id } = await params;
  const manga = await getMangaWithInventory(id);
  if (!manga) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <MangaDetail manga={manga} />
          <SimilarCarousel mangaId={manga.id} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
