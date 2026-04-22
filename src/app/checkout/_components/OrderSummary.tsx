import Image from "next/image";
import { Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { StockMap } from "./useCheckout";

interface CartItem {
  volumeId: string;
  title: string;
  imageUrl?: string;
  quantity: number;
  price: number;
  source: string;
}

interface Props {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  stockMap: StockMap;
}

export function OrderSummary({
  items,
  totalItems,
  totalPrice,
  stockMap,
}: Props) {
  return (
    <div className="rounded-lg border border-[#1e2c31] bg-[#02090a] p-6">
      <h2 className="mb-4 text-lg font-medium text-white">
        Resumen del pedido
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const info = stockMap[item.volumeId];
          return (
            <div key={item.volumeId} className="flex items-center gap-3">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={40}
                  height={56}
                  className="h-14 w-10 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#71717a]">
                    x{item.quantity}
                  </span>
                  {item.source === "ai-suggested" && (
                    <Badge variant="secondary" className="text-[10px]">
                      IA
                    </Badge>
                  )}
                </div>
                {info && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <Package className="size-3 text-[#71717a]" />
                    <span
                      className={`text-[10px] ${
                        !info.canBeDropshipped && info.stock < item.quantity
                          ? "text-destructive"
                          : "text-[#71717a]"
                      }`}
                    >
                      {info.canBeDropshipped && item.quantity > info.stock
                        ? `${info.stock} en stock · ${item.quantity - info.stock} bajo pedido`
                        : `${info.stock} en stock${info.canBeDropshipped ? " · Bajo pedido" : ""}`}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm font-medium">
                S/ {(item.quantity * item.price).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center justify-between">
        <span className="text-[#a1a1aa]">
          Total ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </span>
        <span className="text-lg font-bold text-white">
          S/ {totalPrice.toFixed(2)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-[#102620] px-3 py-2">
        <Truck className="h-4 w-4 text-neon" />
        <div className="text-sm">
          <p className="font-medium text-white">Tiempo estimado de entrega</p>
          <p className="text-xs text-[#a1a1aa]">
            {items.some((i) => stockMap[i.volumeId]?.canBeDropshipped)
              ? "7–15 días hábiles (incluye artículos bajo pedido)"
              : "3–5 días hábiles"}
          </p>
        </div>
      </div>
    </div>
  );
}
