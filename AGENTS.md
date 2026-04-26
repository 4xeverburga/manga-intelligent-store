<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
├── infrastructure/             → Adapters: db, ai, payment, social, config, bot
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

### Bot Variant System

The AI chat bot is configured via **bot variants**. A variant is a named snapshot of the full bot: model, system prompt, enabled tools, temperature, and max agentic steps.

- **Entity**: `BotVariant` (`src/core/domain/entities/BotVariant.ts`) — pure interface.
- **Port**: `IBotVariantRegistry` (`src/core/domain/ports/IBotVariantRegistry.ts`) — `resolve(variantId) → BotVariant`.
- **Adapter**: `BotVariantRegistry` (`src/infrastructure/bot/BotVariantRegistry.ts`) — **single source of truth** for all variant definitions.
- **Selection**: `CHAT_BOT_VARIANT` env var (free-form string, validated at runtime by the registry).

To add, rename, or modify a variant, **edit only `src/infrastructure/bot/BotVariantRegistry.ts`**. No other file needs to change.

Naming convention: `<slot><semver>` — `a*` = baseline, `b*` = challenger. Bump the patch when **any** component changes (e.g., `av0.1` → `av0.2`).

### Styling

**`DESIGN.md` is the single source of truth for all visual decisions.** Read it before writing or modifying any UI code — no exceptions.

- Tailwind utility classes — dark-first, using the exact hex values from `DESIGN.md`
- Shadcn/UI components live in `src/components/ui/` — override default tokens (e.g., `destructive`) with design-system colors
- Conditional classes via `cn()` from `@/lib/utils`
- **No warm colors** (red, orange, yellow) — the palette is strictly cool (greens, teals, zinc neutrals)
- Surface hierarchy: Void `#000` → Deep Teal `#02090A` → Dark Forest `#061A1C` → Forest `#102620`
- Accent: Neon Green `#36F4A4` — focus rings and small highlights only
- Text: White `#FFF` primary, `#A1A1AA` muted, `#71717A` tertiary
- Borders: `#1E2C31` on dark surfaces

### Environment Variables

- Validated at startup via `instrumentation.ts` → Zod schema
- See `.env.example` for the full list of required variables
- Fail fast on missing or invalid config — never silently fall back

### Testing

- Vitest — test files in `src/__tests__/`
- Integration tests may hit real services; require `.env.test` or `.env.local`
- `npm test` (single run) / `npm run test:watch`

### Documentation

- Keep documentation up to date continuously — **update `docs/status.md` after every task**.
- Documentation files must live in the `docs/` folder.
- Maintain long-form project history in `docs/logbooks/[iso_date].md`.
- Maintain current execution state (pending and completed tasks) in `docs/status.md`.
- Store project artifacts co-created with the user in `docs/artifacts/`.
- Push updated documentation to the `docs` branch first.
- If direct push to `docs` is blocked, create a topic branch prefixed with `docs/` (for example: `copilot/docs/update-logbook`) and open a PR into `docs`.
- After documentation is merged into `docs`, open a PR from `docs` into the target branch.

#### Logbook Conventions (`docs/logbooks/*.md`)

- Each entry must include a sequential number, a descriptive title, and the date.
- Include technical details: configurations, commands, IPs, endpoints, and error messages.
- Use fenced code blocks with the appropriate language identifier (`bash`, `properties`, `text`, etc.).
- Record findings, root causes, and decisions (not only actions).
- Redact all sensitive data (keys, passwords, tokens).

#### Status Conventions (`docs/status.md`)

- Maintain sections for **Done**, **Pending**, and **Risks / Blockers**.
- Each pending task must include an owner in brackets: `**[{Owner1}]**`.
- Use checkboxes consistently: `- [x]` for done and `- [ ]` for pending.
- Include a **Next Milestone** section with a clear, measurable goal.
- Update the **Team Ownership** table whenever roles change.

#### Artifacts (`docs/artifacts/`)

Artifacts are deliverables co-created between the team and AI agents during the project lifecycle.

| Subdirectory | Content |
|---|---|
| `docs/artifacts/use-cases/` | Use case specifications |
| `docs/artifacts/user-stories/` | User stories |
| `docs/artifacts/misuse-cases/` | Misuse or abuse case specifications |
| `docs/artifacts/diagrams/` | PlantUML sources (`.puml`) and rendered outputs |

- Use case and misuse case files should follow: `UC-{NNN}-{short-description}.md` and `MUC-{NNN}-{short-description}.md`.
- User stories should follow: `US-{NNN}-{short-description}.md`.
- PlantUML diagram sources must be committed as `.puml` files; rendered images (`.png`, `.svg`) may be included alongside them.

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
```

## Key Principles

- **Thin route handlers** — no business logic in `src/app/api/`. Extract into use cases.
- **Domain purity** — entities and ports have zero dependencies on frameworks or libraries.
- **Explicit mapping** — never leak DB row shapes into domain code. Adapters own the translation.
- **Fail loud** — validate env vars at boot, validate inputs at boundaries, throw instead of returning magic values.
- **Spanish UI** — all user-facing text (errors, labels, chat responses) in Spanish.
