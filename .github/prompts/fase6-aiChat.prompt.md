------


















































































































- [ ] Tool results muestran cards con imagen del manga- [ ] Mensajes renderizan markdown correctamente- [ ] Layout 3 columnas funciona en desktop, colapsa en mobile- [ ] AI nunca ofrece quitar items manuales- [ ] Primer mensaje es el formulario de onboarding- [ ] Tool `add_to_cart` notifica al cliente para actualizar carrito- [ ] Tool `search_manga` retorna mangas relevantes del RAG- [ ] Chat en `/app` responde con streaming## Criterios de Aceptación- Espacio para AI Interest Tags (se implementa en Fase 9).- Mostrar avatar placeholder y "Conecta tu perfil" como CTA.### 8. Left Sidebar (placeholder)- Indicador de typing/streaming.- Input fijo al fondo con auto-resize.- Mostrar tool results como cards de manga (imagen, título, score, botón "Agregar").- Renderizar mensajes con markdown.- Usar `useChat` de Vercel AI SDK.### 7. Componente de Chat — `src/app/(dashboard)/app/_components/Chat.tsx`  - "¿Tienes perfil de Reddit o MyAnimeList? (Opcional: puedo analizarlo)"  - "¿Tienes un manga favorito?"  - "¿Qué géneros te gustan? (Acción, Romance, Terror, Seinen, Shonen...)"- "¡Hola! Soy tu asistente manga. Para darte las mejores recomendaciones, cuéntame:"Si el historial de chat está vacío, el primer mensaje del bot debe ser un formulario conversacional:### 6. Onboarding (primer mensaje)```}  },    return { added: true, mangaId, title, source: 'ai-suggested' };    // se actualiza en el cliente via Zustand.    // Retorna confirmación. El estado real del carrito  execute: async ({ mangaId, title }) => {  }),    title: z.string().describe('Título del manga'),    mangaId: z.string().describe('ID del manga a agregar'),  parameters: z.object({  description: 'Agrega un manga al carrito del usuario',add_to_cart: {```typescript### 5. Tool: `add_to_cart````}  },    // 3. Retornar resultados formateados    // 2. Llamar match_mangas(embedding, threshold=0.3, limit=5)    // 1. Generar embedding del query con gemini-embedding-001  execute: async ({ query }) => {  }),    query: z.string().describe('Descripción o título del manga a buscar'),  parameters: z.object({  description: 'Busca mangas similares a la consulta del usuario usando RAG semántico',search_manga: {```typescript### 4. Tool: `search_manga`- Cuando no tiene contexto del usuario, iniciar con el formulario de onboarding.- **Restricción crítica**: "NUNCA puedes eliminar o modificar items agregados manualmente por el usuario. Solo puedes agregar items nuevos."- Indicar que puede buscar mangas similares y agregarlos al carrito.- Presentarse como asistente de "Hablemos Manga".El system prompt debe:### 3. System Prompt```}  return result.toDataStreamResponse();  });    },      add_to_cart: { ... },      search_manga: { ... },    tools: {    messages,    system: SYSTEM_PROMPT,    model: google('gemini-1.5-flash'),  const result = streamText({  const { messages } = await req.json();export async function POST(req: Request) {import { google } from '@ai-sdk/google';import { streamText } from 'ai';```typescript### 2. API Route — `src/app/api/chat/route.ts`- Usar componentes Shadcn `ScrollArea`, `Sheet` para mobile.- Responsive: en mobile, sidebars collapsan a sheets/drawers.```└─────────────┴─────────────────────┴─────────────┘│  ~280px     │  flex-1             │  ~320px     ││  (Insights) │  (Conversational)   │  (Cart)     ││  Sidebar    │  Chat               │  Sidebar    ││  Left       │  Center             │  Right      │┌─────────────┬─────────────────────┬─────────────┐```### 1. Layout 3 columnas — `src/app/(dashboard)/app/layout.tsx`## Tareas- Fase 5 (Design system y componentes Shadcn).- Fase 4 (500 mangas con embeddings en DB).- Fase 3 (función `match_mangas`, DrizzleMangaRepository).## DependenciasConstruir el flujo conversacional principal del dashboard: un chat que usa Vercel AI SDK con Gemini 1.5 Flash, herramientas (tool calling) para buscar mangas y agregarlos al carrito, y RAG con la función `match_mangas` para recomendaciones semánticas.## Objetivo# Fase 6 — AI Chatbot con RAG---description: "Fase 6: Implementar chatbot AI con Vercel AI SDK, Gemini 1.5 Flash, RAG con match_mangas y tool calling (add_to_cart, search_manga)"description: "Fase 6: Implementar chatbot AI con Vercel AI SDK, Gemini, tool calling, onboarding y RAG con match_mangas"
---
# Fase 6 — AI Chatbot con RAG

## Objetivo
Construir el flujo conversacional central del dashboard: un chatbot alimentado por Vercel AI SDK + Gemini 1.5 Flash con tool calling que recomienda mangas usando RAG (búsqueda semántica con `match_mangas`), gestiona el carrito y presenta un formulario de onboarding como primer mensaje.

## Dependencias
- Fase 3 (tabla mangas + match_mangas funcionando).
- Fase 4 (500 mangas con embeddings en DB).
- Fase 5 (Design system y layout base).

## Tareas

### 1. Layout de 3 columnas — `src/app/(dashboard)/app/layout.tsx`
```
┌──────────┬──────────────────┬──────────┐
│  LEFT    │     CENTER       │  RIGHT   │
│ SIDEBAR  │     CHAT         │ SIDEBAR  │
│ (Insights│  (Conversación)  │ (Cart)   │
│  280px)  │   (flex-1)       │  (320px) │
└──────────┴──────────────────┴──────────┘
```
- Responsive: en mobile, sidebars colapsables con Sheet/Drawer.
- Center column ocupa todo el espacio disponible.

### 2. API Route — `src/app/api/chat/route.ts`
Usar `streamText` de Vercel AI SDK con `@ai-sdk/google`:
```typescript
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      search_manga,
      add_to_cart,
      get_recommendations,
    },
  });
  
  return result.toDataStreamResponse();
}
```

### 3. System Prompt
Definir en `src/infrastructure/ai/prompts.ts`:
- Personalidad: experto en manga, amigable, entusiasta pero conciso.
- Instrucciones: siempre buscar en la DB antes de recomendar (usar tool `search_manga`).
- Restricción: NUNCA inventar mangas que no estén en la base de datos.
- Restricción: NUNCA eliminar o modificar items del carrito agregados manualmente por el usuario.
- Formato: usar markdown para formatear respuestas (negrita para títulos, listas para recomendaciones).

### 4. Tool Definitions

#### `search_manga`
- Input: `{ query: string }`
- Genera embedding del query → llama a `match_mangas` → retorna top 5-10 resultados.
- El AI usa los resultados para formular su respuesta.

#### `add_to_cart`
- Input: `{ mangaId: string, reason?: string }`
- Agrega manga al carrito con `source: 'ai-suggested'`.
- Retorna confirmación al chat.

#### `get_recommendations`
- Input: `{ genres?: string[], mood?: string, similar_to?: string }`
- Construye query de búsqueda semántica combinando inputs.
- Retorna lista de mangas recomendados con score de similitud.

### 5. Componente Chat — `src/app/(dashboard)/app/page.tsx`
Usar `useChat` de Vercel AI SDK:
```typescript
import { useChat } from 'ai/react';
```
- Mostrar mensajes con burbujas estilizadas (user vs assistant).
- Renderizar herramientas ejecutadas como cards embebidos (ej: manga card cuando search_manga retorna resultados).
- Input con textarea auto-expandible.
- Indicador de "typing" mientras el AI responde.

### 6. Flujo de Onboarding (Primer mensaje)
El primer mensaje del assistant (no del user) debe ser un formulario/prompt de onboarding:
```
¡Hola! 👋 Soy tu asistente manga personalizado.

Para recomendarte los mejores títulos, cuéntame:
1. ¿Qué géneros te gustan? (acción, romance, isekai, horror...)
2. ¿Algún manga que hayas disfrutado últimamente?
3. ¿Tienes usuario de Reddit o MyAnimeList? (opcional)
```
- Las respuestas del usuario alimentan el contexto del chat para personalizar futuras recomendaciones.
- Si proporciona username social, trigger la integración de Fase 9.

### 7. GeminiAdapter — `src/infrastructure/ai/GeminiAdapter.ts`
Implementa `IAIService`:
- `generateEmbedding()`: usa Vercel AI SDK `embed()` con `gemini-embedding-001` (3072 dims).
- `generateEmbeddingBatch()`: procesa en lotes con rate limiting.
- El chat se maneja directamente via Vercel AI SDK (no necesita pasar por este adapter).

## Criterios de Aceptación
- [ ] Chat responde en streaming con respuestas contextuales sobre manga
- [ ] `search_manga` tool busca en DB y retorna resultados semánticos
- [ ] `add_to_cart` agrega items al carrito y se refleja en sidebar
- [ ] Primer mensaje es el onboarding (no requiere input del user)
- [ ] AI nunca inventa mangas que no estén en la DB
- [ ] Layout 3 columnas funciona en desktop, colapsa en mobile
- [ ] Tool calls se renderizan como cards/componentes visuales en el chat
