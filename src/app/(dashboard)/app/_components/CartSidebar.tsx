"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingCart, Plus, Minus, Check, X, Package, Loader2 } from "lucide-react";
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

type StockMap = Record<string, { stock: number; canBeDropshipped: boolean; price: number }>;

interface InsufficientItem {
  volumeId: string;
  title: string;
  requested: number;
  available: number;
}

function CartItemRow({
  item,
  showApprove,
  stockInfo,
}: {
  item: CartItem;
  showApprove?: boolean;
  stockInfo?: { stock: number; canBeDropshipped: boolean };
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
            S/ {item.price.toFixed(2)}
          </span>
        </div>
        {stockInfo && (
          <div className="mt-0.5 flex items-center gap-1">
            <Package className="size-3 text-muted-foreground" />
            <span
              className={`text-[10px] ${
                !stockInfo.canBeDropshipped && stockInfo.stock < item.quantity
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {stockInfo.canBeDropshipped && item.quantity > stockInfo.stock
                ? `${stockInfo.stock} en stock · ${item.quantity - stockInfo.stock} bajo pedido`
                : `${stockInfo.stock} en stock${stockInfo.canBeDropshipped ? " · Bajo pedido" : ""}`
              }
            </span>
          </div>
        )}
        {/* Quantity controls */}
        <div className="mt-1 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => updateQuantity(item.volumeId, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-5 text-center text-xs">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => updateQuantity(item.volumeId, item.quantity + 1)}
            disabled={
              stockInfo
                ? stockInfo.canBeDropshipped
                  ? item.quantity >= stockInfo.stock + 3
                  : item.quantity >= stockInfo.stock
                : false
            }
          >
            <Plus className="size-3" />
          </Button>
        </div>
        {stockInfo && !stockInfo.canBeDropshipped && item.quantity >= stockInfo.stock && (
          <p className="mt-0.5 text-[10px] text-amber-500">
            No hay más stock disponible
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {showApprove && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => approveItem(item.volumeId)}
            className="text-emerald-400 hover:text-emerald-300"
            title="Aprobar"
          >
            <Check className="size-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => removeItem(item.volumeId)}
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
  const router = useRouter();
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);
  const allItems = useCartStore(useShallow((s) => s.items));
  const manualItems = useCartStore(
    useShallow((s) => s.items.filter((i) => i.source === "manual"))
  );
  const aiItems = useCartStore(
    useShallow((s) => s.items.filter((i) => i.source === "ai-suggested"))
  );
  const clearAISuggestions = useCartStore((s) => s.clearAISuggestions);
  const isEmpty = totalItems === 0;

  const [stockMap, setStockMap] = useState<StockMap>({});
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[]>([]);

  const updatePrice = useCartStore((s) => s.updatePrice);

  const fetchStock = useCallback(async (items: CartItem[]) => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.volumeId).join(",");
    try {
      const res = await fetch(`/api/mangas/stock?ids=${ids}`);
      if (res.ok) {
        const data: StockMap = await res.json();
        setStockMap(data);
        // Hydrate stale prices from DB
        for (const item of items) {
          const info = data[item.volumeId];
          if (info && info.price > 0 && info.price !== item.price) {
            updatePrice(item.volumeId, info.price);
          }
        }
      }
    } catch { /* ignore */ }
  }, [updatePrice]);

  // Only re-fetch stock when the set of volume IDs changes, not on quantity updates
  const volumeIdKey = allItems.map((i) => i.volumeId).sort().join(",");
  const initialFetchDone = useRef(false);
  useEffect(() => {
    // On first mount, delay fetch so any pending reservation release (sendBeacon)
    // from checkout can complete before we read inventory.
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      const t = setTimeout(() => fetchStock(allItems), 500);
      return () => clearTimeout(t);
    }
    fetchStock(allItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeIdKey, fetchStock]);

  const handleReserveAndPay = useCallback(async () => {
    if (allItems.length === 0) return;
    setReserving(true);
    setError("");
    setInsufficientItems([]);

    try {
      const res = await fetch("/api/checkout/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: allItems.map((i) => ({
            volumeId: i.volumeId,
            title: i.title,
            quantity: i.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody.insufficient?.length > 0) {
          setInsufficientItems(errBody.insufficient);
          fetchStock(allItems);
        }
        throw new Error(
          errBody.error || "No se pudo reservar el stock"
        );
      }

      const { orderId, expiresAt } = await res.json();
      // Stash pre-reservation stock snapshot for checkout display
      try { sessionStorage.setItem("checkout_stock", JSON.stringify(stockMap)); } catch {}
      router.push(`/checkout?orderId=${orderId}&expiresAt=${encodeURIComponent(expiresAt)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al reservar el stock"
      );
    } finally {
      setReserving(false);
    }
  }, [allItems, router, fetchStock]);

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
                  <CartItemRow key={item.volumeId} item={item} stockInfo={stockMap[item.volumeId]} />
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
                  <CartItemRow key={item.volumeId} item={item} showApprove stockInfo={stockMap[item.volumeId]} />
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

          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
          {insufficientItems.length > 0 && (
            <div className="mt-1 space-y-1">
              {insufficientItems.map((item) => (
                <p key={item.volumeId} className="text-[10px] text-destructive">
                  {item.title}: pedido {item.requested}, disponible {item.available}
                </p>
              ))}
            </div>
          )}

          <Separator className="my-3" />
          <Button
            onClick={handleReserveAndPay}
            disabled={reserving}
            className="w-full bg-cta text-cta-foreground hover:bg-cta/90"
          >
            {reserving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reservando...
              </>
            ) : (
              `Ir a Pagar S/ ${totalPrice.toFixed(2)}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
