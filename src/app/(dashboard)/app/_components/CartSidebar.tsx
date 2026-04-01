"use client";

import Image from "next/image";
import { Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart";

export function CartSidebar() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Carrito</h2>
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {items.length}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 opacity-30" />
            <p className="text-sm">Tu carrito está vacío</p>
            <p className="text-xs">
              La IA puede agregar mangas aquí por ti
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {items.map((item) => (
              <div
                key={item.mangaId}
                className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50"
              >
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
                      ${item.price.toFixed(2)}
                    </span>
                    {item.source === "ai-suggested" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 text-primary border-primary/30"
                      >
                        IA
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(item.mangaId)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {items.length > 0 && (
        <div className="border-t border-border/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
          <Separator className="my-3" />
          <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90">
            Pagar con Niubiz
          </Button>
        </div>
      )}
    </div>
  );
}
