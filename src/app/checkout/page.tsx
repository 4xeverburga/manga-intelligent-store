"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useCartStore,
  selectTotalItems,
  selectTotalPrice,
} from "@/stores/cart";
import { useShallow } from "zustand/react/shallow";

type CheckoutStatus =
  | "idle"
  | "reserving"
  | "reserved"
  | "paying"
  | "success"
  | "error";

declare global {
  interface Window {
    VisanetCheckout?: {
      configure(config: Record<string, unknown>): void;
      open(): void;
    };
  }
}

export default function CheckoutPage() {
  const items = useCartStore(useShallow((s) => s.items));
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);
  const clearCart = useCartStore((s) => s.clear);

  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txnId, setTxnId] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Reservation state
  const [orderId, setOrderId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<number>(0);

  // Load Niubiz Lightbox script
  useEffect(() => {
    if (document.getElementById("niubiz-checkout-script")) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "niubiz-checkout-script";
    script.src =
      "https://static-content-qas.vnforapps.com/v2/js/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status !== "reserved" && status !== "paying") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAtRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        // Only expire if we haven't completed the payment
        if (status === "reserved") {
          handleExpired();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleExpired = useCallback(async () => {
    if (orderId) {
      await fetch("/api/checkout/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }
    setStatus("error");
    setErrorMsg(
      "Tu reserva ha expirado. El stock fue liberado. Puedes intentar de nuevo."
    );
    setOrderId(null);
  }, [orderId]);

  // Release reservation when leaving the page
  useEffect(() => {
    const releaseOnUnload = () => {
      if (orderId && status === "reserved") {
        navigator.sendBeacon(
          "/api/checkout/release",
          new Blob(
            [JSON.stringify({ orderId })],
            { type: "application/json" }
          )
        );
      }
    };

    window.addEventListener("beforeunload", releaseOnUnload);
    return () => window.removeEventListener("beforeunload", releaseOnUnload);
  }, [orderId, status]);

  // Step 1: Reserve stock
  const handleReserve = useCallback(async () => {
    if (items.length === 0) return;
    setStatus("reserving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkout/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            volumeId: i.volumeId,
            title: i.title,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || "No se pudo reservar el stock"
        );
      }

      const { orderId: reservedId, expiresAt } = await res.json();
      setOrderId(reservedId);
      expiresAtRef.current = new Date(expiresAt).getTime();
      setSecondsLeft(
        Math.floor((expiresAtRef.current - Date.now()) / 1000)
      );
      setStatus("reserved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Error al reservar el stock"
      );
    }
  }, [items]);

  // Step 2: Open Niubiz Lightbox (only after reservation)
  const handlePay = useCallback(async () => {
    if (!orderId) return;
    setStatus("paying");

    try {
      const amount = totalPrice;
      const purchaseNumber = `ORD-${Date.now()}`;

      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, orderId: purchaseNumber }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const { sessionToken, merchantId } = await res.json();

      if (!window.VisanetCheckout) {
        throw new Error("Payment script not loaded");
      }

      window.VisanetCheckout.configure({
        sessiontoken: sessionToken,
        channel: "web",
        merchantid: merchantId,
        purchasenumber: purchaseNumber,
        amount: amount.toFixed(2),
        cardholderemail: "customer@hablemosmanga.com",
        expirationminutes: 3,
        timeouturl: `${window.location.origin}/checkout?status=timeout`,
        merchantlogo: `${window.location.origin}/logo.png`,
        formbuttoncolor: "#dc2626",
        action: `${window.location.origin}/checkout?status=callback`,
        complete(params: Record<string, string>) {
          handleVerify(params.transactionToken, merchantId);
        },
      });

      window.VisanetCheckout.open();
    } catch (err) {
      console.error("Payment error:", err);
      // Release reservation on error
      if (orderId) {
        await fetch("/api/checkout/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch(() => {});
      }
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Error al procesar el pago"
      );
      setOrderId(null);
    }
  }, [orderId, totalPrice]);

  // Step 3: Verify + confirm the reservation
  const handleVerify = async (
    transactionId: string,
    merchantId: string
  ) => {
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, merchantId, orderId }),
      });

      const result = await res.json();

      if (result.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTxnId(result.transactionId || transactionId);
        setStatus("success");
        clearCart();
      } else {
        setStatus("error");
        setErrorMsg(result.errorMessage || "La transacción no fue aprobada");
        setOrderId(null);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Error al verificar la transacción");
      setOrderId(null);
    }
  };

  const resetToIdle = () => {
    setStatus("idle");
    setErrorMsg("");
    setOrderId(null);
    setSecondsLeft(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Success screen
  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="animate-in fade-in zoom-in flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold">
            ¡Compra simbólica realizada!
          </h1>
          <p className="text-muted-foreground">
            Transacción: <span className="font-mono">{txnId}</span>
          </p>
          <p className="text-muted-foreground">
            Monto: S/ {totalPrice.toFixed(2)} &middot;{" "}
            {new Date().toLocaleDateString("es-PE")}
          </p>
          <Separator className="my-2 w-48" />
          <Link href="/app">
            <Button className="bg-cta text-cta-foreground hover:bg-cta/90">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Chat
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error screen
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Error en el pago</h1>
          <p className="max-w-sm text-muted-foreground">{errorMsg}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetToIdle}>
              Reintentar
            </Button>
            <Link href="/app">
              <Button variant="ghost">Volver al Chat</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0 && status === "idle") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <Link href="/app">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Chat
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="flex items-center gap-3">
        <Link href="/app">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Order Summary */}
        <div className="rounded-lg border border-border/40 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Resumen del pedido</h2>
          <div className="space-y-3">
            {items.map((item) => (
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
                    <span className="text-xs text-muted-foreground">
                      x{item.quantity}
                    </span>
                    {item.source === "ai-suggested" && (
                      <Badge variant="secondary" className="text-[10px]">
                        IA
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium">
                  S/ {(item.quantity * 1.0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Total ({totalItems} item{totalItems !== 1 ? "s" : ""})
            </span>
            <span className="text-lg font-bold">
              S/ {totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-card p-6">
          {/* Timer badge — visible when reservation is active */}
          {(status === "reserved" || status === "paying") && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                secondsLeft <= 30
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Reserva expira en {formatTime(secondsLeft)}</span>
            </div>
          )}

          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {status === "reserved" || status === "paying"
              ? "Stock reservado. Completa el pago antes de que expire."
              : "Pago simbólico procesado por Niubiz Sandbox"}
          </p>

          {/* Step 1: Reserve stock */}
          {status === "idle" && (
            <Button
              onClick={handleReserve}
              disabled={!scriptLoaded}
              className="w-full max-w-xs bg-cta text-cta-foreground hover:bg-cta/90"
              size="lg"
            >
              Reservar y Pagar S/ {totalPrice.toFixed(2)}
            </Button>
          )}

          {status === "reserving" && (
            <Button
              disabled
              className="w-full max-w-xs bg-cta text-cta-foreground"
              size="lg"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reservando stock...
            </Button>
          )}

          {/* Step 2: Open Lightbox */}
          {status === "reserved" && (
            <Button
              onClick={handlePay}
              className="w-full max-w-xs bg-cta text-cta-foreground hover:bg-cta/90"
              size="lg"
            >
              Abrir pasarela de pago
            </Button>
          )}

          {status === "paying" && (
            <Button
              disabled
              className="w-full max-w-xs bg-cta text-cta-foreground"
              size="lg"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando pago...
            </Button>
          )}

          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Tarjeta de prueba: 4474 1100 0000 0004 &middot; Exp: 12/25 &middot;
            CVV: 111
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/app"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al Chat
        </Link>
      </div>
    </div>
  );
}
