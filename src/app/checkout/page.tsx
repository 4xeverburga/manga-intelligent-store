"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Clock,
  Package,
  Truck,
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

type CheckoutStatus = "reserved" | "paying" | "success" | "expired";

type StockMap = Record<string, { stock: number; canBeDropshipped: boolean }>;

declare global {
  interface Window {
    VisanetCheckout?: {
      configure(config: Record<string, unknown>): void;
      open(): void;
    };
  }
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCartStore(useShallow((s) => s.items));
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);
  const clearCart = useCartStore((s) => s.clear);

  // Read reservation from URL (set by CartSidebar)
  const urlOrderId = searchParams.get("orderId");
  const urlExpiresAt = searchParams.get("expiresAt");

  const [status, setStatus] = useState<CheckoutStatus>("reserved");
  const [errorMsg, setErrorMsg] = useState("");
  const [txnId, setTxnId] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Delivery form state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Stock info
  const [stockMap, setStockMap] = useState<StockMap>({});

  // Reservation state
  const [orderId, setOrderId] = useState<string | null>(urlOrderId);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<number>(
    urlExpiresAt ? new Date(urlExpiresAt).getTime() : 0
  );
  const orderIdRef = useRef<string | null>(urlOrderId);
  const statusRef = useRef<CheckoutStatus>("reserved");

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

  // Load pre-reservation stock snapshot from sessionStorage (set by CartSidebar)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("checkout_stock");
      if (cached) {
        setStockMap(JSON.parse(cached));
        sessionStorage.removeItem("checkout_stock");
      }
    } catch {}
  }, []);

  // Initialize seconds left from URL param
  useEffect(() => {
    if (urlExpiresAt) {
      const remaining = Math.max(
        0,
        Math.floor((new Date(urlExpiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    }
  }, [urlExpiresAt]);

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
    setStatus("expired");
    setErrorMsg(
      "Tu reserva ha expirado. El stock fue liberado. Vuelve al carrito para intentar de nuevo."
    );
    setOrderId(null);
  }, [orderId]);

  // Release reservation when leaving the page
  // Keep refs in sync so cleanup can read latest values
  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Release reservation on tab close / hard refresh only
  useEffect(() => {
    const release = () => {
      const id = orderIdRef.current;
      const s = statusRef.current;
      if (id && (s === "reserved" || s === "paying")) {
        navigator.sendBeacon(
          "/api/checkout/release",
          new Blob(
            [JSON.stringify({ orderId: id })],
            { type: "application/json" }
          )
        );
      }
    };

    window.addEventListener("beforeunload", release);
    return () => window.removeEventListener("beforeunload", release);
  }, []);

  // Explicit release + navigate — used by all "back" buttons
  const handleGoBack = useCallback(async () => {
    const id = orderIdRef.current;
    const s = statusRef.current;
    if (id && (s === "reserved" || s === "paying")) {
      await fetch("/api/checkout/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      }).catch(() => {});
      setOrderId(null);
    }
    router.push("/app");
  }, [router]);

  // Save delivery info and open Niubiz Lightbox
  const handlePay = useCallback(async () => {
    if (!orderId) return;

    // Validate delivery form
    if (!email.trim() || !phone.trim() || !deliveryAddress.trim()) {
      setErrorMsg("Completa todos los datos de envío antes de continuar.");
      return;
    }
    setErrorMsg("");
    setStatus("paying");

    try {
      // Save delivery info
      await fetch("/api/checkout/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          email: email.trim(),
          phone: phone.trim(),
          deliveryAddress: deliveryAddress.trim(),
        }),
      });

      const purchaseNumber = `ORD-${Date.now()}`;

      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, purchaseNumber }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || "No se pudo crear la sesión de pago"
        );
      }

      // Amount comes from server (DB order total), not client store
      const { sessionToken, merchantId, amount } = await res.json();

      if (!window.VisanetCheckout) {
        throw new Error("Payment script not loaded");
      }

      window.VisanetCheckout.configure({
        sessiontoken: sessionToken,
        channel: "web",
        merchantid: merchantId,
        purchasenumber: purchaseNumber,
        amount: Number(amount).toFixed(2),
        cardholderemail: email || "customer@hablemosmanga.com",
        expirationminutes: Math.ceil(
          (Number(process.env.NEXT_PUBLIC_RESERVATION_TTL_SECONDS) || 300) / 60
        ),
        timeouturl: `${window.location.origin}/checkout?status=timeout`,
        merchantlogo: `${window.location.origin}/logo.png`,
        formbuttoncolor: "#36f4a4",
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
      setStatus("expired");
      setErrorMsg(
        err instanceof Error ? err.message : "Error al procesar el pago"
      );
      setOrderId(null);
    }
  }, [orderId, totalPrice, email, phone, deliveryAddress]);

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
        setStatus("expired");
        setErrorMsg(result.errorMessage || "La transacción no fue aprobada");
        setOrderId(null);
      }
    } catch {
      setStatus("expired");
      setErrorMsg("Error al verificar la transacción");
      setOrderId(null);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Success screen
  if (status === "success") {
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

  // No reservation (direct navigation without going through cart)
  if (!urlOrderId || items.length === 0) {
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

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 bg-black px-4 py-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-light text-white">Checkout</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Order Summary */}
        <div className="rounded-lg border border-[#1e2c31] bg-[#02090a] p-6">
          <h2 className="mb-4 text-lg font-medium text-white">Resumen del pedido</h2>
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
                            : `${info.stock} en stock${info.canBeDropshipped ? " · Bajo pedido" : ""}`
                          }
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

          {/* Expected delivery time */}
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

        {/* Delivery form + Payment */}
        <div className="flex flex-col gap-6">
          {/* Delivery info form */}
          <div className="rounded-lg border border-[#1e2c31] bg-[#02090a] p-6">
            <h2 className="mb-4 text-lg font-medium text-white">Datos de envío</h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-medium text-[#a1a1aa]"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={status === "paying" || status === "expired"}
                  className="w-full rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-xs font-medium text-[#a1a1aa]"
                >
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+51 999 999 999"
                  disabled={status === "paying" || status === "expired"}
                  className="w-full rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="address"
                  className="mb-1 block text-xs font-medium text-[#a1a1aa]"
                >
                  Dirección de entrega
                </label>
                <textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Av. Ejemplo 123, Distrito, Ciudad"
                  rows={2}
                  disabled={status === "paying" || status === "expired"}
                  className="w-full resize-none rounded-md border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Payment section */}
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
                <Button variant="outline" onClick={handleGoBack}>
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
                    onClick={handlePay}
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

            {process.env.NEXT_PUBLIC_APP_ENVIRONMENT === "DEV" && (
              <>
                <p className="mt-3 text-center text-[11px] font-medium text-amber-500">
                  Entorno de desarrollo — No se realizará un cobro real
                </p>
                <p className="mt-1 text-center text-[10px] text-[#71717a]">
                  Tarjeta de prueba: 4474 1100 0000 0004 &middot; Exp: 12/25
                  &middot; CVV: 111
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleGoBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al Chat
        </button>
      </div>
    </div>
  );
}
