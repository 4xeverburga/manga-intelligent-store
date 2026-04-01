export interface Manga {
  id: string;
  jikanId: number;
  title: string;
  synopsis: string;
  genres: string[];
  imageUrl: string;
  score: number;
  popularity: number;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}
