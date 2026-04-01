---
description: "Fase 2: Crear entidades de dominio y puertos (interfaces) de Hablemos Manga con arquitectura hexagonal"
---
# Fase 2 — Capa de Dominio (Entidades + Puertos)

## Objetivo
Definir el núcleo de negocio puro sin dependencias externas: entidades tipadas y puertos (interfaces) que establezcan los contratos para toda la infraestructura.

## Dependencias
- Fase 1 completada (proyecto inicializado, estructura de carpetas creada).

## Tareas

### 1. Entidad `Manga` — `src/core/domain/entities/Manga.ts`
```typescript
export interface Manga {
  id: string;                  // UUID de la DB
  jikanId: number;            // ID único de Jikan API
  title: string;
  synopsis: string;
  genres: string[];           // ["Action", "Adventure", ...]
  imageUrl: string;           // URL del cover
  score: number;              // Rating (0-10)
  popularity: number;         // Ranking de popularidad
  embedding?: number[];       // Vector 3072-dim (opcional en dominio)
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Entidad `CartItem` — `src/core/domain/entities/CartItem.ts`
```typescript
export type CartItemSource = 'manual' | 'ai-suggested';

export interface CartItem {
  mangaId: string;
  manga: Manga;
  quantity: number;
  source: CartItemSource;      // Distinguir quién lo agregó
  addedAt: Date;
}
```

### 3. Entidad `Cart` — `src/core/domain/entities/Cart.ts`
```typescript
export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;         // Siempre quantity * S/1.00
}
```

### 4. Entidad `UserInsight` — `src/core/domain/entities/UserInsight.ts`
```typescript
export interface UserInsight {
  username: string;
  platform: 'reddit' | 'mal';
  avatarUrl?: string;
  bio?: string;
  favoriteGenres: string[];
  interestTags: string[];      // AI-generated tags
  rawData?: Record<string, unknown>;
  syncedAt: Date;
}
```

### 5. Puerto `IMangaRepository` — `src/core/domain/ports/IMangaRepository.ts`
```typescript
export interface IMangaRepository {
  findById(id: string): Promise<Manga | null>;
  findByJikanId(jikanId: number): Promise<Manga | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<Manga[]>;
  findByGenres(genres: string[]): Promise<Manga[]>;
  searchByText(query: string): Promise<Manga[]>;
  findSimilar(embedding: number[], limit?: number): Promise<Manga[]>;
  upsertFromSeed(manga: Omit<Manga, 'id' | 'createdAt' | 'updatedAt'>): Promise<Manga>;
  count(): Promise<number>;
}
```

### 6. Puerto `IAIService` — `src/core/domain/ports/IAIService.ts`
```typescript
export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IAIService {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateEmbeddingBatch(texts: string[]): Promise<EmbeddingResult[]>;
  chat(messages: ChatMessage[]): Promise<ReadableStream>;
}
```

### 7. Puerto `IProfileService` — `src/core/domain/ports/IProfileService.ts`
```typescript
export interface IProfileService {
  fetchProfile(username: string, platform: 'reddit' | 'mal'): Promise<UserInsight>;
  extractInterestTags(profile: UserInsight): Promise<string[]>;
}
```

### 8. Puerto `IPaymentProvider` — `src/core/domain/ports/IPaymentProvider.ts`
```typescript
export interface PaymentSession {
  sessionToken: string;
  merchantId: string;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentProvider {
  createSession(amount: number, orderId: string): Promise<PaymentSession>;
  verifyTransaction(transactionId: string, merchantId: string): Promise<PaymentResult>;
}
```

### 9. Barrel exports — `src/core/domain/entities/index.ts` y `src/core/domain/ports/index.ts`
Re-exportar todo para imports limpios: `import { Manga, Cart } from '@/core/domain/entities'`.

## Principios
- **Cero imports de infraestructura** en esta capa. Solo TypeScript puro.
- Las entidades son interfaces (no clases) para mantener simplicidad y serializabilidad.
- Los puertos definen el "qué" pero nunca el "cómo".

## Criterios de Aceptación
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Ningún archivo en `src/core/domain/` importa de `src/infrastructure/` o `src/app/`
- [ ] Todas las entidades y puertos tienen tipos explícitos (no `any`)
- [ ] Barrel exports funcionan correctamente
