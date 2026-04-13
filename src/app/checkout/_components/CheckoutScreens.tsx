import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SuccessScreen({
  txnId,
  totalPrice,
}: {
  txnId: string;
  totalPrice: number;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4">
      <div className="animate-in fade-in zoom-in flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-neon" />
        <h1 className="text-2xl font-light text-white">
          ¡Compra simbólica realizada!
        </h1>
        <p className="text-[#a1a1aa]">
          Transacción: <span className="font-mono">{txnId}</span>
        </p>
        <p className="text-[#a1a1aa]">
          Monto: S/ {totalPrice.toFixed(2)} &middot;{" "}
          {new Date().toLocaleDateString("es-PE")}
        </p>
        <Separator className="my-2 w-48" />
        <Link href="/app">
          <Button className="rounded-full bg-white text-black hover:bg-white/90">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Chat
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function EmptyCartScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4">
      <ShoppingBag className="h-16 w-16 text-[#71717a]/30" />
      <h1 className="text-xl font-light text-white">Tu carrito está vacío</h1>
      <Link href="/app">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Chat
        </Button>
      </Link>
    </div>
  );
}

export function VerifyingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4">
      <Loader2 className="h-10 w-10 animate-spin text-neon" />
      <p className="text-[#a1a1aa]">Verificando tu pago...</p>
    </div>
  );
}
