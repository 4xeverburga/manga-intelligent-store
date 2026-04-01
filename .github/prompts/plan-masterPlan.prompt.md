---
description: "Master plan completo de Hablemos Manga. Roadmap de 11 fases con dependencias, entregables y criterios de aceptación."
---
# Hablemos Manga — Master Plan

## Visión
Dashboard manga store de 3 columnas con AI Agent que analiza huella social (Reddit/MAL) para recomendaciones hiper-personalizadas y carrito de compras simbólicas de S/ 1.00 vía Niubiz.

## Arquitectura
Hexagonal (Clean Architecture). Dependencias apuntan hacia adentro.
- `src/core/domain` — Entidades + Puertos (interfaces)
- `src/core/application` — Casos de uso
- `src/infrastructure` — Adaptadores (Drizzle, Gemini, Niubiz, Scrapers)
- `src/app` — Next.js 15 App Router (Rutas, UI, Zustand)

## Tech Stack
- Framework: Next.js 15 (App Router) + TypeScript
- DB/ORM: Supabase (PostgreSQL) + pgvector + Drizzle ORM
- AI: Vercel AI SDK + Gemini 1.5 Flash + gemini-embedding-001
- Payments: Niubiz API REST (Sandbox)
- State: Zustand (Cart & Insights)
- Styling: Tailwind CSS + Shadcn/UI + Framer Motion

## Design System: Modern Midnight Manga
- Theme: Dark mode default (`bg-slate-950`)
- Background: `#020617` (Slate-950)
- Surfaces: `#0f172a` (Slate-900)
- AI Accent: `#6366f1` (Indigo-500)
- CTA/Action: `#dc2626` (Crimson-600)

---

## Fases

### Fase 1 — Bootstrap & Arquitectura Hexagonal
> Prompt: [fase1-bootstrap](.github/prompts/fase1-bootstrap.prompt.md)

**Entregables:** Proyecto Next.js 15 inicializado, dependencias instaladas, estructura hexagonal de carpetas creada.
**Criterio:** `npm run dev` levanta sin errores, estructura de carpetas verificada.

### Fase 2 — Capa de Dominio (Entidades + Puertos)
> Prompt: [fase2-domain](.github/prompts/fase2-domain.prompt.md)
> Depende de: Fase 1

**Entregables:** Entidades Manga, CartItem, Cart, UserInsight. Puertos IMangaRepository, IAIService, IProfileService, IPaymentProvider.
**Criterio:** TypeScript compila sin errores, interfaces cubren todos los casos de uso del spec.

### Fase 3 — Infraestructura de Datos (Drizzle + pgvector)
> Prompt: [fase3-dataInfra](.github/prompts/fase3-dataInfra.prompt.md)
> Depende de: Fase 2

**Entregables:** Drizzle config, schema de tabla `mangas` con vector(3072), migraciones versionadas, función SQL `match_mangas`, cliente DB.
**Criterio:** Migraciones se aplican a Supabase sin errores, `match_mangas` responde a consulta de prueba.

### Fase 4 — Seed Script (Jikan + Embeddings)
> Prompt: [fase4-seed](.github/prompts/fase4-seed.prompt.md)
> Depende de: Fase 3

**Entregables:** `scripts/seed.ts` idempotente que carga 500 mangas de Jikan con embeddings de Gemini.
**Criterio:** 500 registros con embedding no-nulo, re-ejecución no duplica, métricas impresas al final.

### Fase 5 — Design System & Landing Page
> Prompt: [fase5-designSystem](.github/prompts/fase5-designSystem.prompt.md)
> Depende de: Fase 1

**Entregables:** Tailwind config con palette Midnight Manga, Shadcn/UI inicializado, layout base con dark mode, landing page `/` con CTA "Start Chat".
**Criterio:** Landing renderiza correctamente, tema oscuro aplicado, CTA navega a `/app`.

### Fase 6 — AI Chatbot con RAG
> Prompt: [fase6-aiChat](.github/prompts/fase6-aiChat.prompt.md)
> Depende de: Fases 3, 4, 5

**Entregables:** Ruta `/app` con layout 3 columnas, chat conversacional con Vercel AI SDK + Gemini, tool calling (`add_to_cart`, `search_manga`), onboarding como primer mensaje, RAG con `match_mangas`.
**Criterio:** Chat responde con contexto de mangas, herramientas se ejecutan, primer mensaje es formulario de onboarding.

### Fase 7 — Catálogo (`/catalogue`)
> Prompt: [fase7-catalogue](.github/prompts/fase7-catalogue.prompt.md)
> Depende de: Fases 3, 5

**Entregables:** Grid de 500 mangas, filtros multi-select por género, barra de búsqueda, infinite scroll, botón "Find Similar" (RAG search).
**Criterio:** Mangas se cargan desde DB, filtros funcionan en combinación, scroll infinito sin glitches, Find Similar retorna resultados semánticos.

### Fase 8 — Smart Cart (Zustand)
> Prompt: [fase8-smartCart](.github/prompts/fase8-smartCart.prompt.md)
> Depende de: Fase 6

**Entregables:** `useCartStore` con Zustand + persistencia, distinción `manualItems` vs `aiSuggestedItems`, sidebar derecho del dashboard, protección de items manuales (AI no puede removerlos).
**Criterio:** Items manuales persisten tras refresh, AI puede agregar pero no eliminar manuales, sidebar refleja estado en tiempo real.

### Fase 9 — Integración Social (Reddit/MAL)
> Prompt: [fase9-socialProfile](.github/prompts/fase9-socialProfile.prompt.md)
> Depende de: Fase 6

**Entregables:** Scraper/adapter para Reddit y MyAnimeList, extracción de intereses/géneros favoritos, sidebar izquierdo con avatar/bio y AI Interest Tags.
**Criterio:** Dado un username, se extraen al menos 5 tags de interés, sidebar muestra perfil y tags.

### Fase 10 — Checkout con Niubiz
> Prompt: [fase10-niubiz](.github/prompts/fase10-niubiz.prompt.md)
> Depende de: Fase 8

**Entregables:** Autenticación server-side en 2 pasos (Security Token → Session Token), ruta `/checkout` con resumen, integración Niubiz Lightbox, callback de verificación de transacción.
**Criterio:** Flujo completo en sandbox: abrir lightbox → pagar S/1.00 → callback actualiza UI con resultado.

### Fase 11 — Producción & Docker
> Prompt: [fase11-production](.github/prompts/fase11-production.prompt.md)
> Depende de: Todas

**Entregables:** Dockerfile multi-stage (standalone), validación de env vars al startup, error boundaries, meta tags SEO, `.env.example` documentado.
**Criterio:** `docker build` + `docker run` levanta la app completa, todas las rutas funcionan, env vars validadas.

---

## Grafo de Dependencias

```
Fase 1 (Bootstrap)
├── Fase 2 (Domain) → Fase 3 (Data) → Fase 4 (Seed)
├── Fase 5 (Design)                                  
│   ├── Fase 7 (Catalogue) ←── Fase 3               
│   └── Fase 6 (AI Chat) ←── Fases 3,4              
│       ├── Fase 8 (Cart) → Fase 10 (Niubiz)        
│       └── Fase 9 (Social)                          
└── Fase 11 (Production) ←── Todas                   
```

## Variables de Entorno Requeridas

| Variable | Uso | Fase |
|----------|-----|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Embeddings + Chat AI | 4, 6 |
| `DATABASE_URL` | Conexión directa Postgres (Drizzle) | 3+ |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase público | 3+ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Auth pública Supabase | 3+ |
| `NIUBIZ_MERCHANT_ID` | ID de comercio Niubiz | 10 |
| `NIUBIZ_API_USERNAME` | Usuario API Niubiz | 10 |
| `NIUBIZ_API_PASS` | Contraseña API Niubiz | 10 |
| `NIUBIZ_SECURITY_URL` | Endpoint token seguridad | 10 |
| `NIUBIZ_SESSION_URL` | Endpoint token sesión | 10 |
| `NEXT_PUBLIC_APP_URL` | URL base de la app | 10 |
