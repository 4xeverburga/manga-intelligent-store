export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IAIService {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateEmbeddingBatch(texts: string[]): Promise<EmbeddingResult[]>;
  chat(messages: ChatMessage[]): Promise<ReadableStream>;
}
