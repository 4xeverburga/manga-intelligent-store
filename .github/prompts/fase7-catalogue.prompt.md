---
description: "Fase 7: Crear página de catálogo con grid de 500 mangas, filtros multi-select, búsqueda, infinite scroll y botón Find Similar (RAG)"
---
# Fase 7 — Catálogo (`/catalogue`)

## Objetivo
Construir la página de exploración `/catalogue` donde el usuario puede navegar los 500 mangas con filtros, búsqueda de texto e infinite scroll, y descubrir mangas similares usando el RAG semántico.

## Dependencias
- Fase 3 (DrizzleMangaRepository, match_mangas).
- Fase 5 (Design system, componentes Shadcn).

## Tareas

### 1. Server Component + Client interactivity
- La página base es Server Component que hace el fetch inicial.
- Filtros, búsqueda e infinite scroll son Client Components.

### 2. API Routes para el catálogo
`src/app/api/mangas/route.ts`:
```typescript
// GET /api/mangas?page=1&limit=24&genres=Action,Romance&search=naruto
// Retorna: { data: Manga[], nextPage: number | null, total: number }
```

`src/app/api/mangas/similar/route.ts`:
```typescript
// POST /api/mangas/similar { mangaId: string }
// 1. Obtener embedding del manga
// 2. Llamar match_mangas excluyendo el propio manga
// Retorna: Manga[] (top 6 similares)
```

### 3. Grid de mangas
- Responsive grid: 2 cols mobile, 3 cols tablet, 4-5 cols desktop.
- Cada card muestra:
  - Cover image (con lazy loading y placeholder blur).
  - Título (truncado a 2 líneas).
  - Score badge (color coded: verde >8, amarillo >6, rojo <6).
  - Géneros como badges (máximo 3 visibles).
  - Botón "Add to Cart" (source: manual).
  - Botón "Find Similar" (ícono de brújula/sparkle).

### 4. Filtros multi-select por género
- Extraer todos los géneros únicos de la DB.
- Multi-select con checkboxes (Shadcn `Popover` + `Command`).
- Los filtros se aplican combinados (AND): "Action AND Romance".
- URL search params para persistencia: `/catalogue?genres=Action,Romance`.
- Mostrar badges de filtros activos con "x" para remover.

### 5. Barra de búsqueda
- Input con debounce (300ms).
- Búsqueda por título (ILIKE en DB).
- Combinable con filtros de género.
- Mostrar "No se encontraron resultados" con CTA para limpiar filtros.

### 6. Infinite Scroll
- Usar `IntersectionObserver` o librería como `react-intersection-observer`.
- Cargar 24 mangas por página.
- Mostrar skeleton loaders durante carga.
- Indicador de "Has llegado al final" cuando no hay más resultados.

### 7. Modal "Find Similar"
Al click en "Find Similar":
- Abrir modal/drawer con spinner.
- POST a `/api/mangas/similar` con el mangaId.
- Mostrar grid de 6 mangas similares con score de similitud (%).
- Cada resultado tiene "Add to Cart" y "Ver en catálogo".

### 8. Animaciones
- Cards con fade-in stagger al cargar.
- Hover: lift + shadow sutil.
- Transición suave al filtrar (layout animation con Framer Motion).

## Criterios de Aceptación
- [ ] Grid muestra mangas paginados desde la DB
- [ ] Filtros por género funcionan en combinación
- [ ] Búsqueda por texto filtra en tiempo real con debounce
- [ ] Infinite scroll carga más mangas sin glitches
- [ ] "Find Similar" retorna mangas semánticamente relevantes
- [ ] Score de similitud visible en resultados
- [ ] Responsive en mobile, tablet y desktop
- [ ] Skeleton loaders visibles durante carga
- [ ] URL refleja filtros activos (shareable)
