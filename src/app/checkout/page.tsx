"use client";

import { Suspense } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckout } from "./_components/useCheckout";
import { OrderSummary } from "./_components/OrderSummary";
import { DeliveryForm } from "./_components/DeliveryForm";
import { PaymentSection } from "./_components/PaymentSection";
import {
  SuccessScreen,
  EmptyCartScreen,
  VerifyingScreen,
} from "./_components/CheckoutScreens";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const checkout = useCheckout();

  if (checkout.status === "success") {
    return (
      <SuccessScreen
        txnId={checkout.txnId}
        totalPrice={checkout.confirmedAmount ?? checkout.totalPrice}
      />
    );
  }

  // Show verifying screen while recovering from Niubiz redirect
  if (
    (checkout.callbackStatus === "callback" ||
      checkout.callbackStatus === "timeout") &&
    checkout.status === "paying"
  ) {
    return <VerifyingScreen />;
  }

  // No reservation (direct navigation without going through cart)
  if (
    !checkout.callbackStatus &&
    (!checkout.urlOrderId || checkout.items.length === 0)
  ) {
    return <EmptyCartScreen />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 bg-black px-4 py-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={checkout.handleGoBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-light text-white">Checkout</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <OrderSummary
          items={checkout.items}
          totalItems={checkout.totalItems}
          totalPrice={checkout.totalPrice}
          stockMap={checkout.stockMap}
        />

        <div className="flex flex-col gap-6">
          <DeliveryForm
            email={checkout.email}
            setEmail={checkout.setEmail}
            phone={checkout.phone}
            setPhone={checkout.setPhone}
            deliveryAddress={checkout.deliveryAddress}
            setDeliveryAddress={checkout.setDeliveryAddress}
            status={checkout.status}
          />

          <PaymentSection
            status={checkout.status}
            secondsLeft={checkout.secondsLeft}
            totalPrice={checkout.totalPrice}
            scriptLoaded={checkout.scriptLoaded}
            errorMsg={checkout.errorMsg}
            formatTime={checkout.formatTime}
            onPay={checkout.handlePay}
            onGoBack={checkout.handleGoBack}
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={checkout.handleGoBack}
          className="text-sm text-[#a1a1aa] hover:text-white"
        >
          ← Volver al Chat
        </button>
      </div>
    </div>
  );
}
