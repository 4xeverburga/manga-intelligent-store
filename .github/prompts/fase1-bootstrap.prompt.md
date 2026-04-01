---
description: "Fase 1: Inicializar Next.js 15, instalar dependencias y crear estructura hexagonal de Hablemos Manga"
---
# Fase 1 — Bootstrap & Arquitectura Hexagonal

## Objetivo
Crear la base técnica del proyecto desde cero: inicializar Next.js 15 con App Router y TypeScript, instalar todas las dependencias necesarias para el proyecto completo, y establecer la estructura de carpetas hexagonal.

## Tareas

### 1. Inicializar Next.js 15
- Ejecutar `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (o equivalente sin interactividad).
- Confirmar que `npm run dev` levanta en `localhost:3000`.

### 2. Instalar dependencias del proyecto
```bash
# Base de datos
npm i drizzle-orm postgres dotenv
npm i -D drizzle-kit tsx

# AI & Embeddings
npm i ai @ai-sdk/google @google/generative-ai

# UI
npm i framer-motion zustand
npx shadcn@latest init

# Payments (solo tipos por ahora)
# Se instalarán en Fase 10

# Validación
npm i zod
```

### 3. Crear estructura hexagonal de carpetas
```
src/
├── core/
│   ├── domain/
│   │   ├── entities/       # Manga.ts, Cart.ts, CartItem.ts, UserInsight.ts
│   │   └── ports/          # IMangaRepository.ts, IAIService.ts, IProfileService.ts, IPaymentProvider.ts
│   └── application/
│       └── use-cases/      # GetRecommendations.ts, ProcessPayment.ts, SyncSocialProfile.ts, ManageCart.ts
├── infrastructure/
│   ├── db/                 # schema.ts, client.ts, migrations/
│   ├── ai/                 # GeminiAdapter.ts
│   ├── payment/            # NiubizAdapter.ts
│   └── social/             # RedditScraper.ts, MALScraper.ts
└── app/                    # Next.js App Router (ya creado por create-next-app)
    ├── (landing)/          # Landing page
    ├── (dashboard)/app/    # Main 3-column dashboard
    ├── catalogue/          # Browse mangas
    └── checkout/           # Niubiz checkout
scripts/
└── seed.ts                 # Seed script (Fase 4)
```

### 4. Configurar path aliases en tsconfig
Verificar que `@/*` apunta a `./src/*` y agregar alias útiles:
- `@/core/*` → `./src/core/*`
- `@/infrastructure/*` → `./src/infrastructure/*`

### 5. Crear `.env.example`
Documentar todas las variables requeridas por el proyecto (sin valores reales).

## Criterios de Aceptación
- [ ] `npm run dev` levanta sin errores
- [ ] Estructura de carpetas hexagonal existe y tiene archivos placeholder (`.gitkeep` o `index.ts`)
- [ ] TypeScript compila sin errores (`npx tsc --noEmit`)
- [ ] `.env.example` documenta todas las variables necesarias
- [ ] `.gitignore` incluye `.env.local`, `node_modules/`, `.next/`
