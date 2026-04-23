import { ShoppingBag, ArrowLeft, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutStatus } from "./useCheckout";

interface Props {
  status: CheckoutStatus;
  secondsLeft: number;
  totalPrice: number;
  scriptLoaded: boolean;
  errorMsg: string;
  formatTime: (secs: number) => string;
  onPay: () => void;
  onGoBack: () => void;
}

export function PaymentSection({
  status,
  secondsLeft,
  totalPrice,
  scriptLoaded,
  errorMsg,
  formatTime,
  onPay,
  onGoBack,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[#1e2c31] bg-[#02090a] p-6">
      {/* Timer badge */}
      {(status === "reserved" || status === "paying") && secondsLeft > 0 && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            secondsLeft <= 30
              ? "bg-destructive/10 text-destructive"
              : "bg-neon/10 text-neon"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reserva expira en {formatTime(secondsLeft)}</span>
        </div>
      )}

      <ShoppingBag className="mb-4 h-12 w-12 text-[#71717a]/30" />

      {status === "expired" ? (
        <>
          <p className="mb-4 text-center text-sm text-destructive">
            {errorMsg}
          </p>
          <Button variant="outline" onClick={onGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Carrito
          </Button>
        </>
      ) : (
        <>
          <p className="mb-2 text-center text-sm text-[#a1a1aa]">
            Stock reservado. Completa tus datos y paga antes de que expire.
          </p>

          {errorMsg && (
            <p className="mb-4 text-center text-xs text-destructive">
              {errorMsg}
            </p>
          )}

          {status === "reserved" && (
            <Button
              onClick={onPay}
              disabled={!scriptLoaded}
              className="w-full max-w-xs rounded-full bg-white text-black hover:bg-white/90"
              size="lg"
            >
              {process.env.NEXT_PUBLIC_APP_ENVIRONMENT === "DEV"
                ? `Simular Pagar S/ ${totalPrice.toFixed(2)}`
                : `Pagar S/ ${totalPrice.toFixed(2)}`}
            </Button>
          )}

          {status === "paying" && (
            <Button
              disabled
              className="w-full max-w-xs rounded-full bg-white text-black"
              size="lg"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando pago...
            </Button>
          )}
        </>
      )}

      {process.env.NEXT_PUBLIC_TEST_CARD_NUMBER && (
        <>
          <p className="mt-3 text-center text-[11px] font-medium text-amber-500">
            {process.env.NEXT_PUBLIC_APP_ENVIRONMENT === "DEV"
              ? "Entorno de desarrollo — No se realizará un cobro real"
              : "Pasarela en modo sandbox — No se realizará un cobro real"}
          </p>
          <p className="mt-1 text-center text-[10px] text-[#71717a]">
            Tarjeta de prueba: {process.env.NEXT_PUBLIC_TEST_CARD_NUMBER} &middot; Exp:{" "}
            {process.env.NEXT_PUBLIC_TEST_CARD_EXP_DATE} &middot; CVV:{" "}
            {process.env.NEXT_PUBLIC_TEST_CRD_CVV}
          </p>
        </>
      )}
    </div>
  );
}
