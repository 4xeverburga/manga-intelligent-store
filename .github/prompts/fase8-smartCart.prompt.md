---
description: "Fase 8: Implementar Smart Cart con Zustand, persistencia, distinción manual/AI items y protección contra eliminación por AI"
---
# Fase 8 — Smart Cart (Zustand)

## Objetivo
Implementar el store de carrito con Zustand que distingue entre items agregados manualmente por el usuario y items sugeridos por la AI, con persistencia en localStorage y protección que impide que la AI elimine o modifique items manuales.

## Dependencias
- Fase 6 (Chat con tool calling `add_to_cart`).

## Tareas

### 1. Zustand Store — `src/app/stores/useCartStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartItemSource, Manga } from '@/core/domain/entities';

interface CartState {
  items: CartItem[];
  // Getters
  totalItems: number;
  totalPrice: number;
  manualItems: CartItem[];
  aiSuggestedItems: CartItem[];
  // Actions
  addItem: (manga: Manga, source: CartItemSource) => void;
  removeItem: (mangaId: string, requestedBy: 'user' | 'ai') => void;
  updateQuantity: (mangaId: string, quantity: number, requestedBy: 'user' | 'ai') => void;
  clearCart: () => void;
  clearAiSuggestions: () => void;
}
```

### 2. Lógica de protección
**Regla crítica:** La AI solo puede agregar items. Nunca puede eliminar o modificar items con `source: 'manual'`.

```typescript
removeItem: (mangaId, requestedBy) => {
  if (requestedBy === 'ai') {
    // AI solo puede remover items que ella misma sugirió
    set((state) => ({
      items: state.items.filter(
        (item) => !(item.mangaId === mangaId && item.source === 'ai-suggested')
      ),
    }));
  } else {
    // El usuario puede remover cualquier item
    set((state) => ({
      items: state.items.filter((item) => item.mangaId !== mangaId),
    }));
  }
},
```

### 3. Persistencia
- Usar middleware `persist` de Zustand con `localStorage`.
- Key: `hablemos-manga-cart`.
- Serializar/deserializar fechas correctamente.

### 4. Integración con Chat (AI → Cart)
Cuando el tool `add_to_cart` retorna resultado:
- El componente de chat escucha tool results.
- Llama `useCartStore.getState().addItem(manga, 'ai-suggested')`.
- Muestra confirmación visual en el chat y en el sidebar del carrito.

### 5. Right Sidebar — Cart UI
`src/app/(dashboard)/app/_components/CartSidebar.tsx`:
- **Header**: "Tu Carrito" + badge con count + botón "Ir a Checkout".
- **Sección Manual**: Items agregados por el usuario, con badge "Manual" verde.
- **Sección AI**: Items sugeridos por la AI, con badge "AI" indigo.
  - Cada AI item tiene botón "Aprobar" (convierte a manual) y "Descartar".
- **Cada item muestra**:
  - Cover thumbnail.
  - Título.
  - Precio: S/ 1.00.
  - Quantity selector (+/-).
  - Botón eliminar (X).
- **Footer**: Total (items × S/1.00) + CTA "Checkout".
- **Estado vacío**: Ilustración + "Tu carrito está vacío. ¡Pídele al chat que te recomiende algo!"

### 6. Interacciones del catálogo → carrito
Cuando el usuario da click en "Add to Cart" desde el catálogo:
- `addItem(manga, 'manual')`.
- Toast de confirmación con Shadcn.
- Badge del carrito actualiza en real-time (header o sidebar).

### 7. Computed values
```typescript
get totalItems() { return items.reduce((acc, i) => acc + i.quantity, 0); }
get totalPrice() { return totalItems * 1.00; }  // S/ 1.00 por unidad
get manualItems() { return items.filter(i => i.source === 'manual'); }
get aiSuggestedItems() { return items.filter(i => i.source === 'ai-suggested'); }
```

## Criterios de Aceptación
- [ ] Items manuales persisten en localStorage tras refresh
- [ ] AI puede agregar items con `source: 'ai-suggested'`
- [ ] AI NO puede eliminar items con `source: 'manual'`
- [ ] Usuario puede eliminar cualquier item
- [ ] Sidebar muestra secciones separadas para manual y AI
- [ ] Botón "Aprobar" convierte AI item a manual
- [ ] Total se calcula correctamente (items × S/1.00)
- [ ] Estado vacío muestra placeholder útil
- [ ] Cart badge se actualiza en real-time
