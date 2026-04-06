import type { IOrderService } from "@/core/domain/ports/IOrderService";
import type { IPaymentProvider } from "@/core/domain/ports/IPaymentProvider";

interface Input {
  orderId: string;
  transactionId: string;
  merchantId: string;
}

export class ConfirmOrder {
  constructor(
    private paymentProvider: IPaymentProvider,
    private orderService: IOrderService
  ) {}

  async execute(
    input: Input
  ): Promise<
    { success: true; transactionId: string } | { success: false; errorMessage: string }
  > {
    // 1. Verify payment with Niubiz
    const paymentResult = await this.paymentProvider.verifyTransaction(
      input.transactionId,
      input.merchantId
    );

    if (!paymentResult.success) {
      // Payment failed — release the reservation
      await this.orderService.releaseReservation(input.orderId);
      return {
        success: false,
        errorMessage:
          paymentResult.errorMessage ?? "La transacción no fue aprobada",
      };
    }

    // 2. Confirm the existing reservation
    try {
      await this.orderService.confirmOrder(
        input.orderId,
        paymentResult.transactionId ?? input.transactionId
      );
      return {
        success: true,
        transactionId: paymentResult.transactionId ?? input.transactionId,
      };
    } catch (err) {
      const message =
        err instanceof Error && err.message === "RESERVATION_EXPIRED"
          ? "Tu reserva expiró. El stock fue liberado."
          : "Error al confirmar el pedido";
      return { success: false, errorMessage: message };
    }
  }
}
