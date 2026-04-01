import { embed } from "ai";
import { google } from "@ai-sdk/google";
import type { IAIService, EmbeddingResult } from "@/core/domain/ports";

const EMBEDDING_MODEL = "gemini-embedding-001";

export class GeminiAdapter implements IAIService {
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      value: text,
    });
    return { embedding, model: EMBEDDING_MODEL };
  }

  async generateEmbeddingBatch(
    texts: string[],
    batchSize = 8
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map((t) => this.generateEmbedding(t))
      );
      results.push(...embeddings);
      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return results;
  }

  async chat(): Promise<ReadableStream> {
    throw new Error("Use Vercel AI SDK streamText directly for chat");
  }
}
