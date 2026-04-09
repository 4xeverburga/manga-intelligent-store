import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/infrastructure/db/client";

// Shape of a manga_volumes row joined with its inventory
type VolumeRow = {
  id: string;
  volume_number: number | null;
  title: string;
  cover_url: string | null;
  price: number;
  inventory:
    | { stock: number; can_be_dropshipped: boolean }
    | { stock: number; can_be_dropshipped: boolean }[]
    | null;
};

/**
 * Resolves a human-readable manga title to a single row from the `mangas` table.
 * Shared logic duplicated from checkVolumeAvailability — both tools live here in
 * the adapter layer so we accept this small duplication rather than introducing a
 * shared module.
 */
async function resolveMangaByTitle(
  mangaTitle: string
): Promise<
  | { manga: { id: string; title: string } }
  | { manga: null; reason: "not_found" | "ambiguous"; candidates?: { id: string; title: string }[] }
> {
  const { data: rows } = await supabase
    .from("mangas")
    .select("id, title")
    .ilike("title", `%${mangaTitle}%`)
    .limit(5);

  if (!rows?.length) return { manga: null, reason: "not_found" };

  const exact = rows.find(
    (r) => r.title.toLowerCase() === mangaTitle.toLowerCase()
  );
  if (exact) return { manga: exact };
  if (rows.length === 1) return { manga: rows[0] };

  return { manga: null, reason: "ambiguous", candidates: rows };
}

/**
 * add_volume_to_cart
 *
 * Looks up a specific volume by manga title + volume number, validates that it
 * has stock or can be dropshipped, and returns all the data the client-side
 * <AddVolumeToCartResult> component needs to call `useCartStore.addItem()`.
 *
 * The AI should call check_volume_availability first if availability is unknown.
 */
export function addVolumeToCartTool() {
  return tool({
    description:
      "Agrega un volumen específico de un manga al carrito del usuario. Acepta el nombre del manga — no necesitas el ID. Llama check_volume_availability primero si no sabes si está disponible.",
    inputSchema: z.object({
      mangaTitle: z.string().describe("Nombre (o parte del nombre) del manga"),
      volumeNumber: z.number().int().min(1).describe("Número del volumen a agregar"),
    }),
    execute: async ({ mangaTitle, volumeNumber }) => {
      const resolved = await resolveMangaByTitle(mangaTitle);

      if (!resolved.manga) {
        if (resolved.reason === "not_found") {
          return { success: false, error: `No se encontró "${mangaTitle}" en el catálogo.` };
        }
        return {
          success: false,
          ambiguous: true,
          error: `Encontré varios mangas con ese nombre. ¿A cuál te refieres?`,
          candidates: resolved.candidates,
        };
      }

      const { manga } = resolved;

      const { data, error } = await supabase
        .from("manga_volumes")
        .select("id, volume_number, title, cover_url, price, inventory(stock, can_be_dropshipped)")
        .eq("manga_id", manga.id)
        .eq("volume_number", volumeNumber)
        .limit(1)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: `No se encontró el volumen ${volumeNumber} de "${manga.title}".`,
        };
      }

      const v = data as VolumeRow;
      const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
      const stock = inv?.stock ?? 0;
      const canBeDropshipped = inv?.can_be_dropshipped ?? false;

      // Guard: don't add an item that can never be fulfilled
      if (stock === 0 && !canBeDropshipped) {
        return {
          success: false,
          error: `El volumen ${volumeNumber} de "${manga.title}" no tiene stock y no admite pedido.`,
        };
      }

      return {
        success: true,
        volumeId: v.id,
        volumeNumber: v.volume_number,
        title: v.title,
        imageUrl: v.cover_url ?? undefined,
        price: v.price,
        mangaId: manga.id,
        stock,
        canBeDropshipped,
      };
    },
  });
}
