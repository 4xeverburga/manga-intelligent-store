# Hablemos Manga

AI-powered manga discovery platform with semantic search, chat-based recommendations, and social profile integration.

Built with Next.js 16 (App Router), Supabase PostgreSQL + pgvector, Google Gemini, and Niubiz payments.

## Features

- **AI Chat Assistant** — Conversational manga recommendations using Gemini with tool calling (search + add-to-cart). Responds in Spanish.
- **Semantic Search** — Natural language queries converted to embeddings via `gemini-embedding-001` (3072 dims), matched against pgvector with cosine similarity.
- **Catalogue** — Browse 498 mangas with genre filtering, text search, pagination, and a "Find Similar" modal that uses vector similarity.
- **Social Profile Integration** — Connect MyAnimeList and/or Reddit profiles. The system fetches favorites, reading lists, subreddits, and recent posts, then generates AI interest tags to personalize recommendations.
- **Smart Cart** — AI can suggest items to the cart. Users always have full control over manually-added items (AI cannot remove or modify them).
- **Niubiz Payment** — Sandbox integration with 2-step auth (security token → session token) and Lightbox checkout.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router, `output: "standalone"`) |
| Language | TypeScript 5 |
| Database | Supabase PostgreSQL + pgvector (3072-dim vectors) |
| ORM | Drizzle ORM 0.45.2 |
| AI | Vercel AI SDK 6.x + `@ai-sdk/google` (Gemini) |
| Embeddings | `gemini-embedding-001` (3072 dimensions) |
| Chat Model | `gemini-2.0-flash` (configurable via `GEMINI_MODEL` env) |
| State | Zustand 5.x (persisted cart + profile stores) |
| Styling | Tailwind 4.x + Shadcn/UI |
| Payments | Niubiz (sandbox) |
| Testing | Vitest 4.x |
| Container | Docker (multi-stage, node:25-alpine) |

## Architecture

Hexagonal (Clean Architecture) with domain, ports, adapters, and use cases.

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/         # Manga, Cart, CartItem, UserInsight, MangaWithSimilarity
│   │   └── ports/            # IMangaRepository, IAIService, IProfileService, IPaymentProvider
│   └── application/
│       └── use-cases/        # 7 use cases (see below)
├── infrastructure/
│   ├── db/                   # Supabase client, Drizzle schema, SupabaseMangaRepository
│   ├── ai/                   # GeminiAdapter, system prompts
│   ├── payment/              # NiubizAdapter
│   ├── social/               # MALAdapter, RedditAdapter, ProfileServiceAdapter
│   └── supabase/             # Auth client, middleware, server helpers
├── app/
│   ├── page.tsx              # Landing page
│   ├── catalogue/            # Browse + filter + similar modal
│   ├── (dashboard)/app/      # AI chat dashboard (route group)
│   ├── checkout/             # Payment page
│   └── api/                  # 7 thin route handlers (see below)
├── stores/                   # Zustand: cart.ts, profile.ts
├── components/               # Shared UI (Navbar, Footer, Shadcn components)
└── lib/                      # Utilities (cn helper)
```

### Use Cases

All business logic is extracted into use-case classes. Route handlers are thin HTTP adapters.

| Use Case | Route | Description |
|---|---|---|
| `SearchMangas` | `GET /api/mangas` | Paginated search with genre + text filtering |
| `GetAvailableGenres` | `GET /api/mangas/genres` | Returns distinct genre list |
| `FindSimilarMangas` | `POST /api/mangas/similar` | Finds similar mangas by vector similarity (given a manga ID) |
| `SemanticSearchMangas` | `POST /api/chat` (tool) | Text query → embedding → vector search (used by AI chat tools) |
| `FetchUserProfile` | `POST /api/profile` | Fetch MAL/Reddit profile + generate AI interest tags |
| `CreateCheckoutSession` | `POST /api/checkout/session` | Creates Niubiz payment session |
| `VerifyTransaction` | `POST /api/checkout/verify` | Verifies Niubiz transaction |

### Domain Entities

- **`Manga`** — id, jikanId, title, synopsis, genres[], imageUrl, score, popularity, embedding? (3072-dim), createdAt, updatedAt
- **`MangaWithSimilarity`** — extends Manga with `similarity: number` (0-1 cosine)
- **`Cart`** — items[], totalItems, totalPrice
- **`CartItem`** — mangaId, title, imageUrl, price, quantity, source (`"manual"` | `"ai-suggested"`), addedAt
- **`UserInsight`** — username, platform (`"mal"` | `"reddit"`), avatarUrl, bio, favoriteGenres[], interestTags[], rawData, syncedAt

### Ports (Interfaces)

- **`IMangaRepository`** — findById, findAll, findByGenres, searchByText, findSimilar, searchPaginated, getDistinctGenres, upsertFromSeed, count
- **`IAIService`** — generateEmbedding, generateEmbeddingBatch, chat
- **`IProfileService`** — fetchProfile, extractInterestTags
- **`IPaymentProvider`** — createSession, verifyTransaction

### Infrastructure Adapters

- **`SupabaseMangaRepository`** — Implements `IMangaRepository` using Supabase client + RPC `match_mangas` for vector search. Handles embedding parsing (Supabase returns vectors as strings).
- **`GeminiAdapter`** — Implements `IAIService` using Vercel AI SDK `embed()` with `gemini-embedding-001`.
- **`NiubizAdapter`** — Implements `IPaymentProvider` with 2-step auth flow (Basic Auth → security token → session token → Lightbox).
- **`MALAdapter`** / **`RedditAdapter`** — Fetch user profiles from MyAnimeList and Reddit public APIs.
- **`ProfileServiceAdapter`** — Implements `IProfileService`, dispatches to MAL/Reddit adapters + Gemini for AI interest tag generation.

## Database

### Schema

Single table `mangas` in Supabase PostgreSQL with pgvector extension:

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| jikan_id | integer | Unique index, from Jikan API |
| title | text | |
| synopsis | text | Cleaned (no MAL boilerplate) |
| genres | text[] | Array, indexed |
| image_url | text | CDN URL from MyAnimeList |
| score | real | MAL score (0-10) |
| popularity | integer | MAL popularity rank |
| embedding | vector(3072) | Gemini embedding, nullable |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### RPC Function: `match_mangas`

PostgreSQL function for vector similarity search (cosine distance):

```sql
match_mangas(query_embedding vector(3072), match_threshold float DEFAULT 0.5, match_count int DEFAULT 10)
```

Returns matching rows with a `similarity` score (1 - cosine distance). Used by `SupabaseMangaRepository.findSimilar()`.

### Migrations

- `drizzle/0000_soft_thundra.sql` — Table creation + pgvector extension
- `drizzle/0001_match_mangas_function.sql` — `match_mangas` RPC function

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project with pgvector enabled
- Google AI API key (Gemini)
- Niubiz sandbox credentials (for payments)

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash          # optional, defaults to gemini-2.0-flash

# Niubiz (sandbox)
NIUBIZ_MERCHANT_ID=...
NIUBIZ_API_USERNAME=...
NIUBIZ_API_PASS=...
NIUBIZ_SECURITY_URL=https://apisandbox.vnforappstest.com/api.security/v1/security
NIUBIZ_SESSION_URL=https://apisandbox.vnforappstest.com/api.ecommerce/v2/ecommerce/token/session
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install & Run

```bash
npm install
npm run dev            # http://localhost:3000
```

### Database Setup

```bash
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Apply migrations to Supabase
npm run db:seed        # Seed 498 mangas from Jikan + Gemini embeddings (~20 min first run)
npm run db:studio      # Open Drizzle Studio GUI
```

The seed script (`scripts/seed.ts`):
- Fetches top 500 mangas from Jikan API (paginated, 400ms rate limit)
- Cleans synopsis text (removes `[Written by MAL Rewrite]`)
- Generates 3072-dim embeddings with `gemini-embedding-001` (batches of 8)
- Upserts by `jikan_id` for idempotency

### Testing

```bash
npm test               # Run all tests once
npm run test:watch     # Watch mode
```

Integration tests hit the real Supabase database (requires `.env.local`). Current tests:

- **FindSimilarMangas** — Takes Berserk, finds similar mangas via vector search, logs results for human evaluation.

### Docker

```bash
npm run docker:build   # docker build -t hablemos-manga .
npm run docker:run     # docker run -p 3000:3000 --env-file .env.local hablemos-manga
```

Multi-stage build (node:25-alpine): deps → build → standalone runner.

## Project Pages

| Route | Description |
|---|---|
| `/` | Landing page with feature cards |
| `/app` | AI chat dashboard (route group `(dashboard)/app`) |
| `/catalogue` | Browse, filter, search, find similar |
| `/checkout` | Niubiz Lightbox payment |

## AI Chat System

The chat (`/api/chat`) uses Vercel AI SDK `streamText` with two tools:

1. **`search_manga`** — Semantic search: user query → Gemini embedding → pgvector `match_mangas` RPC → returns matching mangas with similarity scores.
2. **`add_to_cart`** — Adds a manga to the user's cart (source: `"ai-suggested"`).

The system prompt instructs the AI to always search before recommending, never invent mangas, and never modify user-added cart items. When user profiles are connected, profile data (favorites, subreddits, reading lists) is injected into the system prompt for personalized recommendations.

## Git Branches

- **`main`** — Stable, all 11 development phases complete
- **`dev`** — Active development (hexagonal refactoring, use-case extraction, tests, bug fixes)

### Key `dev` Branch Changes (not yet merged to main)

- Extracted all business logic from 7 route handlers into use-case classes
- Extended domain layer (MangaWithSimilarity, SearchFilters, PaginatedResult)
- Added `searchPaginated()` and `getDistinctGenres()` to repository
- Fixed embedding parsing bug (Supabase returns vector columns as strings, not arrays)
- Added Vitest with integration tests for similarity search
- Added ProfileServiceAdapter implementing IProfileService port

## Known Issues / Notes

- `gemini-2.0-flash` is deprecated (shutdown June 1, 2026). Migrate to `gemini-3-flash-preview` or `gemini-2.5-flash-lite` before then. Set `GEMINI_MODEL` env var to switch.
- Embedding model `gemini-embedding-001` is free tier; `gemini-embedding-2-preview` supports multimodal if needed later.
- Supabase returns pgvector columns as strings. The repository's `parseEmbedding()` method handles this (JSON.parse for strings, passthrough for arrays).
- Environment variables are validated at startup in production via `instrumentation.ts` → `validateEnv()` (Zod schema).
- Cart prices are currently hardcoded/synthetic (no real pricing source).
- No authentication — profiles are client-side only (Zustand persisted to localStorage).
