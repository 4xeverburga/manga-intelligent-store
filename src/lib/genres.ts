/** English → Spanish genre mapping (Jikan API genres → display names). */
const GENRE_MAP: Record<string, string> = {
  Action: "Acción",
  Adventure: "Aventura",
  "Award Winning": "Premiados",
  "Boys Love": "Boys Love",
  Comedy: "Comedia",
  Drama: "Drama",
  Ecchi: "Ecchi",
  Erotica: "Erótica",
  Fantasy: "Fantasía",
  "Girls Love": "Girls Love",
  Gourmet: "Gourmet",
  Horror: "Horror",
  Josei: "Josei",
  Kids: "Infantil",
  Mystery: "Misterio",
  Romance: "Romance",
  "Sci-Fi": "Ciencia Ficción",
  Seinen: "Seinen",
  Shoujo: "Shoujo",
  Shounen: "Shounen",
  "Slice of Life": "Recuentos de la Vida",
  Sports: "Deportes",
  Supernatural: "Sobrenatural",
  Suspense: "Suspenso",
};

/** Translate an English genre name to Spanish. Falls back to the original. */
export function genreToSpanish(genre: string): string {
  return GENRE_MAP[genre] ?? genre;
}
