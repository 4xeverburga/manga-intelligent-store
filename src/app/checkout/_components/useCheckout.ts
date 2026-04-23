"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCartStore,
  selectTotalItems,
  selectTotalPrice,
} from "@/stores/cart";
import { useShallow } from "zustand/react/shallow";
import { useNiubizScript } from "./useNiubizScript";
import { useCountdown, formatTime } from "./useCountdown";
import type { CheckoutStatus, StockMap } from "./types";

export type { CheckoutStatus, StockMap };
export { formatTime };

export function useCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCartStore(useShallow((s) => s.items));
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);
  const clearCart = useCartStore((s) => s.clear);

  const urlOrderId = searchParams.get("orderId");
  const urlExpiresAt = searchParams.get("expiresAt");
  const callbackStatus = searchParams.get("status");

  const [status, setStatus] = useState<CheckoutStatus>("reserved");
  const [errorMsg, setErrorMsg] = useState("");
  const [txnId, setTxnId] = useState("");
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [stockMap, setStockMap] = useState<StockMap>({});
  const [orderId, setOrderId] = useState<string | null>(urlOrderId);

  const orderIdRef = useRef<string | null>(urlOrderId);
  const statusRef = useRef<CheckoutStatus>("reserved");

  const scriptLoaded = useNiubizScript();

  // ── Keep refs in sync ───────────────────────────────────────────────
  useEffect(() => { orderIdRef.current = orderId; }, [orderId]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Handlers ────────────────────────────────────────────────────────
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

  const { secondsLeft, stop: stopTimer } = useCountdown(
    urlExpiresAt,
    status,
    handleExpired
  );

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

  const markSuccess = useCallback(
    (txn: string, amount?: number) => {
      stopTimer();
      setTxnId(txn);
      if (amount != null) setConfirmedAmount(amount);
      setStatus("success");
      clearCart();
    },
    [stopTimer, clearCart]
  );

  const markFailed = useCallback((msg: string) => {
    setStatus("expired");
    setErrorMsg(msg);
    setOrderId(null);
  }, []);

  // ── Verify helper (used by both callback recovery and inline complete) ──
  const handleVerify = useCallback(
    async (transactionId: string, merchantId: string, purchaseNumber: string) => {
      try {
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId,
            merchantId,
            orderId: orderIdRef.current,
            purchaseNumber,
          }),
        });
        const result = await res.json();
        if (result.success) {
          markSuccess(result.transactionId || transactionId, result.amount);
        } else {
          markFailed(result.errorMessage || "La transacción no fue aprobada");
        }
      } catch {
        markFailed("Error al verificar la transacción");
      }
    },
    [markSuccess, markFailed]
  );

  // ── Load stock snapshot ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("checkout_stock");
      if (cached) {
        setStockMap(JSON.parse(cached));
        sessionStorage.removeItem("checkout_stock");
      }
    } catch {}
  }, []);

  // ── Recover from Niubiz redirect ───────────────────────────────────
  useEffect(() => {
    if (callbackStatus !== "callback" && callbackStatus !== "timeout") return;

    const ctxRaw = sessionStorage.getItem("checkout_ctx");
    sessionStorage.removeItem("checkout_ctx");

    if (callbackStatus === "timeout") {
      if (ctxRaw) {
        try {
          const { orderId: storedId } = JSON.parse(ctxRaw);
          if (storedId) {
            fetch("/api/checkout/release", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: storedId }),
            }).catch(() => {});
          }
        } catch {}
      }
      setStatus("expired");
      setErrorMsg("El pago fue cancelado o expiró. Vuelve a intentar.");
      return;
    }

    const transactionToken = searchParams.get("transactionToken");
    if (!ctxRaw || !transactionToken) {
      markFailed("No se pudo recuperar la sesión de pago.");
      return;
    }

    try {
      const { orderId: storedOrderId, merchantId, purchaseNumber } = JSON.parse(ctxRaw);
      if (!storedOrderId) {
        markFailed("Datos de pago incompletos.");
        return;
      }

      setOrderId(storedOrderId);
      orderIdRef.current = storedOrderId;
      setStatus("paying");

      handleVerify(transactionToken, merchantId, purchaseNumber);
    } catch {
      markFailed("Error al recuperar la sesión de pago.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Release on tab close (not during payment) ──────────────────────
  useEffect(() => {
    const release = () => {
      const id = orderIdRef.current;
      const s = statusRef.current;
      if (id && s === "reserved") {
        navigator.sendBeacon(
          "/api/checkout/release",
          new Blob([JSON.stringify({ orderId: id })], {
            type: "application/json",
          })
        );
      }
    };
    window.addEventListener("beforeunload", release);
    return () => window.removeEventListener("beforeunload", release);
  }, []);

  // ── Pay ─────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!orderId) return;

    if (!email.trim() || !phone.trim() || !deliveryAddress.trim()) {
      setErrorMsg("Completa todos los datos de envío antes de continuar.");
      return;
    }
    setErrorMsg("");
    setStatus("paying");

    try {
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

      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "No se pudo crear la sesión de pago");
      }

      const { sessionToken, merchantId, amount, purchaseNumber: pn } = await res.json();

      if (!window.VisanetCheckout) throw new Error("Payment script not loaded");

      window.VisanetCheckout.configure({
        sessiontoken: sessionToken,
        channel: "web",
        merchantid: merchantId,
        purchasenumber: pn,
        amount: Number(amount).toFixed(2),
        cardholderemail: email,
        expirationminutes: Math.ceil(
          (Number(process.env.NEXT_PUBLIC_RESERVATION_TTL_SECONDS) || 300) / 60
        ),
        timeouturl: `${window.location.origin}/checkout?status=timeout`,
        merchantlogo: `${window.location.origin}/logo.png`,
        formbuttoncolor: "#36f4a4",
        action: `${window.location.origin}/api/checkout/callback`,

        complete(params: Record<string, string>) {
          handleVerify(params.transactionToken, merchantId, pn);
        },
      });

      try {
        sessionStorage.setItem(
          "checkout_ctx",
          JSON.stringify({ orderId, merchantId, purchaseNumber: pn })
        );
      } catch {}

      window.VisanetCheckout.open();
    } catch (err) {
      console.error("Payment error:", err);
      if (orderId) {
        await fetch("/api/checkout/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch(() => {});
      }
      setStatus("expired");
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar el pago");
      setOrderId(null);
    }
  }, [orderId, email, phone, deliveryAddress, handleVerify]);

  return {
    status,
    errorMsg,
    txnId,
    confirmedAmount,
    scriptLoaded,
    items,
    totalItems,
    totalPrice,
    stockMap,
    secondsLeft,
    callbackStatus,
    urlOrderId,
    email,
    setEmail,
    phone,
    setPhone,
    deliveryAddress,
    setDeliveryAddress,
    handlePay,
    handleGoBack,
    formatTime,
  };
}
