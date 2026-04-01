---
description: "Fase 11: Dockerfile multi-stage, validación de env vars, error boundaries, SEO, .env.example y producción"
---
# Fase 11 — Producción & Docker

## Objetivo
Preparar la aplicación para deploy en producción: Dockerfile multi-stage optimizado (standalone mode), validación de variables de entorno al startup, error boundaries globales, meta tags SEO, y documentación final.

## Dependencias
- Todas las fases anteriores completadas.

## Tareas

### 1. Dockerfile multi-stage
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Configurar standalone mode en `next.config.ts`
```typescript
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
    ],
  },
};
```

### 3. Validación de env vars al startup — `src/infrastructure/config/env.ts`
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1),
  NIUBIZ_MERCHANT_ID: z.string().min(1),
  NIUBIZ_API_USERNAME: z.string().email(),
  NIUBIZ_API_PASS: z.string().min(1),
  NIUBIZ_SECURITY_URL: z.string().url(),
  NIUBIZ_SESSION_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```
- Importar en `instrumentation.ts` de Next.js para validar al arrancar.
- Si falta alguna variable, el servidor falla temprano con mensaje claro.

### 4. Error Boundaries
- `src/app/error.tsx` — Global error boundary con UI de fallback.
- `src/app/not-found.tsx` — 404 personalizado con diseño Midnight Manga.
- `src/app/(dashboard)/app/error.tsx` — Error boundary para el dashboard.

### 5. SEO & Meta tags
- `src/app/layout.tsx`: metadata con `generateMetadata()`.
  - Title: "Hablemos Manga — Recomendaciones AI Personalizadas".
  - Description: descriptiva y con keywords.
  - OG tags para compartir.
  - `theme-color: #020617`.
- `public/robots.txt`.
- `src/app/sitemap.ts` — sitemap dinámico.

### 6. `.env.example`
Crear archivo documentado con todas las variables (sin valores reales):
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-key

# Niubiz (Sandbox)
NIUBIZ_MERCHANT_ID=your-merchant-id
NIUBIZ_API_USERNAME=your@email.com
NIUBIZ_API_PASS=your-password
NIUBIZ_SECURITY_URL=https://apisandbox.vnforappstest.com/api.security/v1/security
NIUBIZ_SESSION_URL=https://apisandbox.vnforappstest.com/api.ecommerce/v2/ecommerce/token/session

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. `.dockerignore`
```
node_modules
.next
.git
*.md
.env*
```

### 8. Scripts finales en `package.json`
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed.ts",
    "docker:build": "docker build -t hablemos-manga .",
    "docker:run": "docker run -p 3000:3000 --env-file .env.local hablemos-manga"
  }
}
```

## Criterios de Aceptación
- [ ] `docker build -t hablemos-manga .` completa sin errores
- [ ] `docker run -p 3000:3000 --env-file .env.local hablemos-manga` sirve la app
- [ ] Todas las rutas funcionan en el container (/, /app, /catalogue, /checkout)
- [ ] Env vars faltantes causan fallo temprano con mensaje claro
- [ ] Error boundaries capturan errores sin crashear la app
- [ ] 404 muestra página personalizada
- [ ] `.env.example` documenta todas las variables
- [ ] Meta tags SEO presentes en el HTML renderizado
- [ ] Imagen Docker pesa < 200MB (standalone optimizado)
