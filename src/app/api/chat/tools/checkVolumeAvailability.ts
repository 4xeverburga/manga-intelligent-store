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
 *
 * - If no match exists, returns null with reason "not_found".
 * - If there is an exact (case-insensitive) match among the candidates, that one wins.
 * - If there is only one candidate, it wins without disambiguation.
 * - Otherwise returns null with reason "ambiguous" + the list of candidates so the
 *   AI can ask the user to clarify.
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

  // Prefer exact title match so "Berserk" doesn't accidentally pick "Berserk of Gluttony"
  const exact = rows.find(
    (r) => r.title.toLowerCase() === mangaTitle.toLowerCase()
  );
  if (exact) return { manga: exact };

  // Only one candidate — safe to proceed without asking
  if (rows.length === 1) return { manga: rows[0] };

  return { manga: null, reason: "ambiguous", candidates: rows };
}

/**
 * check_volume_availability
 *
 * Checks stock for one or more volumes of a manga. Accepts a human-readable
 * title — the tool resolves it internally, so the AI never needs to know the
 * internal UUID.
 *
 * Returns structured per-volume availability so the UI component can render
 * clear in-stock / bajo-pedido / unavailable rows.
 */
export function checkVolumeAvailabilityTool() {
  return tool({
    description:
      "Verifica si uno o más volúmenes de un manga están disponibles (en stock o bajo pedido). Acepta el nombre del manga — no necesitas el ID. Úsala antes de agregar al carrito.",
    inputSchema: z.object({
      mangaTitle: z.string().describe("Nombre (o parte del nombre) del manga"),
      volumeFrom: z.number().int().min(1).describe("Número de volumen inicial (inclusive)"),
      volumeTo: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Número de volumen final (inclusive). Omitir para consultar un solo volumen."),
    }),
    execute: async ({ mangaTitle, volumeFrom, volumeTo }) => {
      const resolved = await resolveMangaByTitle(mangaTitle);

      if (!resolved.manga) {
        if (resolved.reason === "not_found") {
          return {
            found: false,
            message: `No se encontró "${mangaTitle}" en el catálogo.`,
            volumes: [],
          };
        }
        // ambiguous — surface candidates to the AI so it can ask the user
        return {
          found: false,
          ambiguous: true,
          message: `Encontré varios mangas con ese nombre. ¿A cuál te refieres?`,
          candidates: resolved.candidates,
          volumes: [],
        };
      }

      const { manga } = resolved;
      const to = volumeTo ?? volumeFrom;

      const { data, error } = await supabase
        .from("manga_volumes")
        .select("id, volume_number, title, cover_url, price, inventory(stock, can_be_dropshipped)")
        .eq("manga_id", manga.id)
        .gte("volume_number", volumeFrom)
        .lte("volume_number", to)
        .order("volume_number", { ascending: true });

      if (error || !data?.length) {
        return {
          found: false,
          message: `No se encontraron volúmenes ${volumeFrom}${to !== volumeFrom ? `–${to}` : ""} de "${manga.title}".`,
          volumes: [],
        };
      }

      const volumes = (data as VolumeRow[]).map((v) => {
        const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
        const stock = inv?.stock ?? 0;
        const canBeDropshipped = inv?.can_be_dropshipped ?? false;
        return {
          volumeId: v.id,
          volumeNumber: v.volume_number,
          title: v.title,
          imageUrl: v.cover_url,
          price: v.price,
          stock,
          canBeDropshipped,
          available: stock > 0 || canBeDropshipped,
        };
      });

      return { found: true, mangaId: manga.id, mangaTitle: manga.title, volumes };
    },
  });
}
