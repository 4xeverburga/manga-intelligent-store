---
description: "Fase 9: Integrar scraping de perfiles Reddit y MyAnimeList para extraer intereses, géneros favoritos y tags AI"
---
# Fase 9 — Integración Social (Reddit/MAL)

## Objetivo
Implementar adaptadores que extraen información pública de perfiles de Reddit y MyAnimeList para alimentar el sidebar de insights del dashboard con avatar, bio y AI Interest Tags personalizados.

## Dependencias
- Fase 6 (Dashboard con chat y sidebar izquierdo placeholder).

## Tareas

### 1. Adapter Reddit — `src/infrastructure/social/RedditAdapter.ts`
Implementa `IProfileService` para Reddit:
- Usar Reddit JSON API pública (no requiere auth para perfiles públicos):
  - `https://www.reddit.com/user/{username}/about.json` → avatar, karma, bio.
  - `https://www.reddit.com/user/{username}/submitted.json?limit=50` → posts recientes.
  - `https://www.reddit.com/user/{username}/comments.json?limit=50` → comentarios.
- Buscar actividad en subreddits de manga/anime: r/manga, r/anime, r/OnePiece, etc.
- Extraer:
  - `avatarUrl`: de `icon_img` o `snoovatar_img`.
  - `bio`: de `subreddit.public_description`.
  - `favoriteGenres`: inferidos de los subreddits más frecuentados.
  - Posts/comments con menciones de títulos de manga → mapear contra DB local.

### 2. Adapter MAL — `src/infrastructure/social/MALAdapter.ts`
Implementa `IProfileService` para MyAnimeList:
- Usar Jikan API para perfil público:
  - `https://api.jikan.moe/v4/users/{username}` → datos básicos.
  - `https://api.jikan.moe/v4/users/{username}/favorites` → mangas/animes favoritos.
  - `https://api.jikan.moe/v4/users/{username}/mangalist?status=completed&order_by=score&sort=desc` → manga list ordenada por score.
- Extraer:
  - `avatarUrl`: de `images.jpg.image_url`.
  - `bio`: de `about`.
  - `favoriteGenres`: extraer géneros de mangas favoritos/mejor puntuados.
  - Títulos concretos que podemos mapear contra nuestra DB.

### 3. Generación de AI Interest Tags
Usar Gemini para analizar los datos extraídos y generar tags descriptivos:
```typescript
const prompt = `Analiza este perfil de usuario de ${platform} y genera 5-8 tags de interés
para recomendaciones de manga. Datos del perfil: ${JSON.stringify(profileData)}.
Retorna un JSON array de strings.`;
```
- Tags ejemplo: "Shonen clásico", "Dark fantasy", "Romance slice-of-life", "Isekai power fantasy".
- Estos tags se muestran en el sidebar y se usan como contexto para el chat AI.

### 4. API Route — `src/app/api/profile/route.ts`
```typescript
// POST /api/profile { username: string, platform: 'reddit' | 'mal' }
// Retorna: UserInsight
```
- Validar input con Zod.
- Seleccionar adapter según platform.
- Generar tags con AI.
- Retornar `UserInsight` completo.

### 5. Left Sidebar actualizado
`src/app/(dashboard)/app/_components/InsightsSidebar.tsx`:
- **Estado sin perfil**: Formulario con input de username + selector de plataforma + botón "Conectar".
- **Estado con perfil**:
  - Avatar (circular, con fallback a iniciales).
  - Username + plataforma.
  - Bio (truncada con "ver más").
  - AI Interest Tags como badges de colores (indigo).
  - Géneros favoritos como chips.
  - Botón "Reconectar" para actualizar.
- **Loading state**: Skeleton placeholders animados.

### 6. Integración con Chat
Cuando se sincroniza un perfil:
- Los interest tags se inyectan como contexto adicional en el system prompt del chat.
- El AI personaliza recomendaciones basándose en los insights del perfil.
- El chat puede mencionar: "Como fan de shonen clásico, te recomiendo..."

## Manejo de Errores
- Perfil privado o inexistente: mostrar error amigable, no crashear.
- Rate limit de APIs: retry con backoff.
- Datos incompletos: usar lo disponible, marcar campos faltantes como null.

## Criterios de Aceptación
- [ ] Dado un username de Reddit, se extrae avatar, bio y actividad
- [ ] Dado un username de MAL, se extraen favoritos y manga list
- [ ] AI genera 5-8 interest tags relevantes basados en el perfil
- [ ] Sidebar muestra perfil completo con tags e info
- [ ] Datos del perfil se inyectan como contexto en el chat
- [ ] Perfiles privados muestran error amigable (no crash)
- [ ] Loading states durante la sincronización
