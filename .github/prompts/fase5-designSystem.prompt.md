---
description: "Fase 5: Configurar Tailwind con theme Midnight Manga, Shadcn/UI, Framer Motion y landing page con CTA"
---
# Fase 5 — Design System & Landing Page

## Objetivo
Establecer el sistema de diseño "Modern Midnight Manga" (dark mode default), configurar Shadcn/UI con el theme personalizado, y construir la landing page `/` con alta conversión y CTA hacia el chat.

## Dependencias
- Fase 1 completada (Tailwind ya instalado con create-next-app).

## Tareas

### 1. Configurar Tailwind con palette Midnight Manga
Extender `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      background: '#020617',    // Slate-950
      surface: '#0f172a',       // Slate-900
      'ai-accent': '#6366f1',   // Indigo-500
      cta: '#dc2626',           // Crimson-600
    },
  },
}
```

### 2. Inicializar Shadcn/UI
- `npx shadcn@latest init` con estilo "new-york", dark mode por defecto.
- Configurar CSS variables para mapear al palette Midnight Manga.
- Instalar componentes base: `button`, `input`, `card`, `badge`, `dialog`, `sheet`, `scroll-area`, `separator`, `avatar`, `tooltip`.

### 3. Configurar Framer Motion
- Crear `src/app/components/motion.ts` con re-exports y variantes reutilizables:
  - `fadeIn`, `slideUp`, `staggerContainer`, `scaleOnHover`.
- Priorizar animaciones sutiles (opacity + translate, duración 200-400ms).

### 4. Layout global `src/app/layout.tsx`
- HTML con `className="dark"` por defecto (dark mode obligatorio).
- Font: Inter o Geist Sans desde `next/font`.
- Background: `bg-background` (`#020617`).
- Meta tags básicos (title, description, viewport, theme-color).

### 5. Landing Page — `src/app/page.tsx`
Ruta `/` con diseño de alta conversión:

**Estructura:**
```
┌────────────────────────────────────────────────┐
│                   NAVBAR                       │
│  Logo "Hablemos Manga"        [Browse] [Start]│
├────────────────────────────────────────────────┤
│                                                │
│              HERO SECTION                      │
│  "Tu siguiente manga favorito,                │
│   recomendado por IA"                          │
│                                                │
│  Subtítulo explicativo                         │
│                                                │
│  [ 🚀 Start Chat ] ← CTA principal (Crimson)  │
│  [ Browse Catalogue ] ← CTA secundario        │
│                                                │
├────────────────────────────────────────────────┤
│           FEATURES (3 cards)                   │
│  🤖 AI Recs    🔍 RAG Search   🛒 Smart Cart  │
├────────────────────────────────────────────────┤
│              FOOTER                            │
└────────────────────────────────────────────────┘
```

**Animaciones:**
- Hero text: fade-in + slide-up staggered
- Feature cards: stagger entrance con scale
- CTA button: pulse glow en hover (indigo/crimson gradient)

**CTA principal:** Navega a `/app` (dashboard con chat).

### 6. Componentes compartidos
- `src/app/components/ui/` — Shadcn components (auto-generado)
- `src/app/components/Navbar.tsx` — Logo + links (sticky, backdrop-blur)
- `src/app/components/Footer.tsx` — Créditos + links

## Criterios de Aceptación
- [ ] Dark mode se aplica globalmente (no hay flash de light mode)
- [ ] Palette Midnight Manga visible en toda la UI
- [ ] Landing page renderiza correctamente en mobile y desktop
- [ ] CTA "Start Chat" navega a `/app`
- [ ] Animaciones de Framer Motion visibles y fluidas
- [ ] Lighthouse: Performance > 90, Accessibility > 90
- [ ] Shadcn components cargados y funcionales
