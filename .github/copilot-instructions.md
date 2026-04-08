# Project Instructions

## Architecture

Hexagonal (Clean Architecture). Strict layer separation — never import infrastructure from domain.

`src/app/` is technically an infrastructure concern (HTTP/UI adapter), but it is deliberately kept as a top-level peer to `core/` and `infrastructure/` because frontend presentation is a first-class concern in user-facing products.

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/           → Interfaces only (no classes, no side effects)
│   │   └── ports/              → Port interfaces consumed by use cases
│   └── application/
│       └── use-cases/          → Business logic classes with constructor DI
├── infrastructure/             → Adapters: db, ai, payment, social, config
├── app/                        → Next.js App Router (pages, layouts, route handlers)
│   ├── api/                    → Thin route handlers — delegate to use cases
│   └── (routes)/               → Pages, layouts, co-located route components
├── components/                 → Shared UI components (presentation layer)
│   └── ui/                     → Shadcn/UI primitives
└── lib/                        → Pure utilities (cn helper, constants) — shared kernel
```

### Layer Rules

1. **Domain** — Pure TypeScript interfaces. Zero framework imports, zero side effects.
2. **Use Cases** — Depend only on ports. Never import concrete adapters or framework code.
3. **Infrastructure** — Implements ports. Owns DB clients, external API calls, config parsing.
4. **App (Route Handlers)** — HTTP adapter: parse request → call use case → return `NextResponse.json()`.
5. **App (Pages/Components)** — Presentation layer. `app/` and `components/` belong here. Delegates server work to route handlers or Server Actions. Never imports from `infrastructure/` directly.
6. **Shared Kernel (`lib/`)** — Framework-agnostic pure utilities. Any layer may import from here. Must have zero dependencies on domain, infrastructure, or app code.

### Dependency Direction

```
Domain ← Use Cases ← Infrastructure
                   ← App / Components (presentation layer)
lib/ (shared kernel — importable by any layer, depends on nothing)
```

## Conventions

### Use Cases

- Class-based with a single `execute()` method
- Constructor injection of port interfaces — never instantiate adapters inside
- Define explicit `Input` and `Output` interfaces per use case (co-located in the same file)
- Normalize and clamp input values at the boundary (e.g., `Math.max(1, page)`)
- Throw errors for invalid state — route handlers catch and map to HTTP responses

```typescript
interface Input { page: number; limit: number; genres?: string[] }
interface Output { data: Manga[]; nextPage: number | null; total: number }

export class SearchMangas {
  constructor(private mangaRepo: IMangaRepository) {}
  async execute(input: Input): Promise<Output> { /* ... */ }
}
```

### Route Handlers (`src/app/api/`)

- Always wrap in `try/catch` with structured JSON error responses
- Validate inputs before delegating (type checks, required fields)
- **Never trust client-sent monetary values** — always re-fetch from DB
- Return `NextResponse.json()` with explicit status codes
- User-facing error messages in Spanish

### Domain Entities

- **Interfaces only** — never classes
- camelCase field names — DB rows use snake_case, adapters handle mapping
- Discriminated unions for variants (e.g., `source: "manual" | "ai-suggested"`)
- Timestamps as `Date` (`createdAt`, `updatedAt`)

### Port Interfaces

- Prefix with `I` (e.g., `IMangaRepository`, `IAIService`, `IOrderService`)
- Verb-noun method names: `findById`, `searchPaginated`, `reserveStock`, `getDistinctGenres`
- Single-result lookups return `Promise<T | null>`

### Infrastructure Adapters

- Class explicitly `implements` the corresponding port interface
- Private `toDomain()` maps DB rows (snake_case) → domain entities (camelCase)
- Use Supabase `.rpc()` for custom PostgreSQL functions
- Supabase returns pgvector columns as strings — always parse with a dedicated helper

### Styling

- Tailwind utility classes — prefer dark theme defaults
- Shadcn/UI components live in `src/components/ui/`
- Conditional classes via `cn()` from `@/lib/utils`

### Environment Variables

- Validated at startup via `instrumentation.ts` → Zod schema
- See `.env.example` for the full list of required variables
- Fail fast on missing or invalid config — never silently fall back

### Testing

- Vitest — test files in `src/__tests__/`
- Integration tests may hit real services; require `.env.test` or `.env.local`
- `npm test` (single run) / `npm run test:watch`

## Commands

```bash
npm run dev             # Dev server
npm run build           # Production build
npm run lint            # ESLint (flat config)
npm test                # Vitest run
npm run test:watch      # Vitest watch
npm run db:generate     # Drizzle — generate migrations
npm run db:migrate      # Drizzle — apply migrations
npm run db:studio       # Drizzle Studio GUI
npm run db:seed         # Seed script
npm run docker:build    # Docker multi-stage build
npm run docker:run      # Run container with .env.local
```

## Key Principles

- **Thin route handlers** — no business logic in `src/app/api/`. Extract into use cases.
- **Domain purity** — entities and ports have zero dependencies on frameworks or libraries.
- **Explicit mapping** — never leak DB row shapes into domain code. Adapters own the translation.
- **Fail loud** — validate env vars at boot, validate inputs at boundaries, throw instead of returning magic values.
- **Spanish UI** — all user-facing text (errors, labels, chat responses) in Spanish.
