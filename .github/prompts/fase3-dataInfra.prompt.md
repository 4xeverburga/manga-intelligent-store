---
description: "Fase 3: Configurar Drizzle ORM con Supabase PostgreSQL, definir schema mangas con pgvector y crear función match_mangas"
---
# Fase 3 — Infraestructura de Datos (Drizzle + Supabase + pgvector)

## Objetivo
Implementar la capa de persistencia: configurar Drizzle con postgres.js para Supabase, definir el schema de la tabla `mangas` con soporte para vectores de 3072 dimensiones (gemini-embedding-001), crear migraciones versionadas, e implementar la función SQL `match_mangas` para búsquedas por similitud coseno.

## Dependencias
- Fase 2 completada (entidades y puertos definidos).
- Variable `DATABASE_URL` configurada para conexión directa a Supabase Postgres.

## Tareas

### 1. Configurar cliente Drizzle — `src/infrastructure/db/client.ts`
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false }); // prepare: false para Supabase
export const db = drizzle(client, { schema });
```

### 2. Definir schema — `src/infrastructure/db/schema.ts`
Tabla `mangas` con campos esenciales:
- `id` — UUID, primary key, default random
- `jikan_id` — integer, unique, not null
- `title` — text, not null
- `synopsis` — text, not null
- `genres` — text array (jsonb o text[])
- `image_url` — text, not null
- `score` — real (float4)
- `popularity` — integer
- `embedding` — vector(3072), nullable (se llena en seed)
- `created_at` — timestamp, default now
- `updated_at` — timestamp, default now

Usar `pgTable` de Drizzle. Para el tipo `vector`, usar la extensión `drizzle-orm/pg-core` con custom type o `pgvector` community package.

### 3. Crear `drizzle.config.ts` en raíz
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 4. Generar y aplicar migraciones
```bash
npx drizzle-kit generate   # Genera SQL en ./drizzle/
npx drizzle-kit migrate    # Aplica a Supabase
```

La primera migración debe incluir:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Función SQL `match_mangas`
Crear migración custom con:
```sql
CREATE OR REPLACE FUNCTION match_mangas(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  jikan_id int,
  title text,
  synopsis text,
  genres text[],
  image_url text,
  score real,
  popularity int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.jikan_id,
    m.title,
    m.synopsis,
    m.genres,
    m.image_url,
    m.score,
    m.popularity,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM mangas m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 6. Implementar adaptador `DrizzleMangaRepository`
`src/infrastructure/db/DrizzleMangaRepository.ts` — Implementa `IMangaRepository` del puerto de dominio usando el cliente Drizzle.

Métodos clave:
- `findSimilar()` — Llama a la función RPC `match_mangas` vía `db.execute(sql\`SELECT * FROM match_mangas(...)\`)`.
- `upsertFromSeed()` — `ON CONFLICT (jikan_id) DO UPDATE` para idempotencia.
- `searchByText()` — `ILIKE` sobre title y synopsis.

### 7. Agregar scripts a `package.json`
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Criterios de Aceptación
- [ ] `npm run db:generate` genera SQL sin errores
- [ ] `npm run db:migrate` aplica migraciones a Supabase exitosamente
- [ ] Extensión `vector` habilitada en la DB
- [ ] Tabla `mangas` existe con todas las columnas definidas
- [ ] Función `match_mangas` existe y responde a query de prueba
- [ ] `DrizzleMangaRepository` implementa todos los métodos de `IMangaRepository`
- [ ] El schema de Drizzle exporta tipos inferidos (`SelectManga`, `InsertManga`)
