---
description: "Fase 4: Script idempotente que carga 500 mangas desde Jikan API con embeddings de Gemini gemini-embedding-001"
---
# Fase 4 — Seed Script (Jikan + Gemini Embeddings)

## Objetivo
Implementar `scripts/seed.ts`: un script idempotente que obtiene los Top 500 mangas de Jikan API, genera embeddings de 3072 dimensiones con Gemini `gemini-embedding-001`, y los persiste en Supabase mediante upsert por `jikan_id`.

## Dependencias
- Fase 3 completada (tabla `mangas` y schema Drizzle listos).
- Variables: `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`.

## Tareas

### 1. Implementar `scripts/seed.ts`
Estructura del script:

```
1. Conectar a DB (reusa client.ts)
2. Paginar Jikan GET /top/manga?page=N (25 per page, ~20 páginas)
3. Por cada manga:
   a. Mapear campos Jikan → modelo DB
   b. Descartar si synopsis es null/vacía
   c. Generar embedding de (title + " — " + synopsis + " Genres: " + genres.join(", "))
4. Upsert en lote (batch de 25)
5. Imprimir resumen
6. Cerrar conexión
```

### 2. Consumir Jikan API
- Endpoint: `https://api.jikan.moe/v4/top/manga`
- Paginación: `?page=1` a `?page=N` (25 items/page)
- Rate limit: ~3 req/s → usar delay de 400ms entre páginas
- Continuar hasta acumular **500 mangas válidas** (con synopsis no vacía)
- Mapeo de campos:
  ```
  mal_id       → jikan_id
  title        → title
  synopsis     → synopsis (limpiar "[Written by MAL Rewrite]")
  genres[].name → genres (array de strings)
  images.jpg.large_image_url → image_url
  score        → score (default 0 si null)
  popularity   → popularity (default 0 si null)
  ```

### 3. Generar embeddings con Gemini
- Modelo: `gemini-embedding-001`
- Dimensión: 3072
- Input: concatenar `title + " — " + synopsis + " Genres: " + genres.join(", ")`
- Rate limit: implementar retry con exponential backoff (max 3 retries)
- Procesar en batches de ~5-10 para no saturar la API
- Si falla un embedding, loguear y continuar (no abortar todo el seed)

### 4. Upsert idempotente
- Usar `ON CONFLICT (jikan_id) DO UPDATE SET` para actualizar title, synopsis, genres, image_url, score, popularity, embedding, updated_at.
- Esto permite re-ejecutar el seed sin duplicados y actualizando datos si Jikan cambió.

### 5. Reporte final
Al terminar, imprimir:
```
📊 Seed completado:
   Páginas leídas: 20
   Mangas procesados: 512
   Mangas válidos (con synopsis): 500
   Insertados nuevos: 500
   Actualizados: 0
   Descartados (sin synopsis): 12
   Errores de embedding: 0
   Tiempo total: 3m 42s
```

### 6. Script en `package.json`
```json
{
  "scripts": {
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

## Manejo de errores
- **Jikan timeout/500**: retry con backoff, max 3 intentos por página.
- **Embedding failure**: loguear manga afectado, insertar con `embedding = null`, continuar.
- **DB error**: loguear y continuar con siguiente batch.
- **Interrupción**: safe to re-run (idempotente por diseño).

## Criterios de Aceptación
- [ ] `npm run db:seed` ejecuta sin errores fatales
- [ ] 500 registros en tabla `mangas` con `embedding IS NOT NULL`
- [ ] Re-ejecutar seed no crea duplicados (cuenta sigue en 500)
- [ ] Synopsis no contiene "[Written by MAL Rewrite]"
- [ ] Genres son arrays de strings limpios
- [ ] Reporte final imprime métricas correctas
