"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingCart, Plus, Minus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useCartStore,
  selectTotalItems,
  selectTotalPrice,
} from "@/stores/cart";
import { useShallow } from "zustand/react/shallow";
import type { CartItem } from "@/core/domain/entities";

function CartItemRow({
  item,
  showApprove,
}: {
  item: CartItem;
  showApprove?: boolean;
}) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const approveItem = useCartStore((s) => s.approveItem);

  return (
    <div className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
      {item.imageUrl && (
        <Image
          src={item.imageUrl}
          alt={item.title}
          width={36}
          height={50}
          className="h-[50px] w-[36px] shrink-0 rounded object-cover"
        />
      )}
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-xs font-medium">{item.title}</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            S/ {(item.quantity * 1.0).toFixed(2)}
          </span>
        </div>
        {/* Quantity controls */}
        <div className="mt-1 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => updateQuantity(item.mangaId, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-5 text-center text-xs">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => updateQuantity(item.mangaId, item.quantity + 1)}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {showApprove && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => approveItem(item.mangaId)}
            className="text-emerald-400 hover:text-emerald-300"
            title="Aprobar"
          >
            <Check className="size-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => removeItem(item.mangaId)}
          className="text-muted-foreground hover:text-destructive"
          title="Eliminar"
        >
          {showApprove ? <X className="size-3" /> : <Trash2 className="size-3" />}
        </Button>
      </div>
    </div>
  );
}

export function CartSidebar() {
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);
  const manualItems = useCartStore(
    useShallow((s) => s.items.filter((i) => i.source === "manual"))
  );
  const aiItems = useCartStore(
    useShallow((s) => s.items.filter((i) => i.source === "ai-suggested"))
  );
  const clearAISuggestions = useCartStore((s) => s.clearAISuggestions);
  const isEmpty = totalItems === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tu Carrito</h2>
        {totalItems > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {totalItems}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 opacity-30" />
            <p className="text-sm">Tu carrito está vacío</p>
            <p className="text-xs">
              ¡Pídele al chat que te recomiende algo!
            </p>
          </div>
        ) : (
          <div className="p-2">
            {/* Manual items section */}
            {manualItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Tus selecciones ({manualItems.length})
                  </span>
                </div>
                {manualItems.map((item) => (
                  <CartItemRow key={item.mangaId} item={item} />
                ))}
              </div>
            )}

            {/* AI suggestions section */}
            {aiItems.length > 0 && (
              <div className={manualItems.length > 0 ? "mt-2" : ""}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Sugerencias IA ({aiItems.length})
                    </span>
                  </div>
                  <button
                    onClick={clearAISuggestions}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Descartar todas
                  </button>
                </div>
                {aiItems.map((item) => (
                  <CartItemRow key={item.mangaId} item={item} showApprove />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {!isEmpty && (
        <div className="border-t border-border/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total ({totalItems} item{totalItems !== 1 ? "s" : ""})
            </span>
            <span className="font-semibold">S/ {totalPrice.toFixed(2)}</span>
          </div>
          <Separator className="my-3" />
          <Link href="/checkout">
            <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90">
              Pagar con Niubiz
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
