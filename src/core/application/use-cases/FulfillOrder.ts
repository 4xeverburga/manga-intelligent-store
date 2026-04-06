import type { IOrderService } from "@/core/domain/ports/IOrderService";
import type { IPaymentProvider } from "@/core/domain/ports/IPaymentProvider";
import type { Order, OrderItem } from "@/core/domain/entities/Order";

interface Input {
  transactionId: string;
  merchantId: string;
  items: OrderItem[];
}

export class FulfillOrder {
  constructor(
    private paymentProvider: IPaymentProvider,
    private orderService: IOrderService
  ) {}

  async execute(input: Input): Promise<{ success: true; order: Order } | { success: false; errorMessage: string }> {
    // 1. Verify payment with Niubiz
    const paymentResult = await this.paymentProvider.verifyTransaction(
      input.transactionId,
      input.merchantId
    );

    if (!paymentResult.success) {
      return {
        success: false,
        errorMessage: paymentResult.errorMessage ?? "La transacción no fue aprobada",
      };
    }

    // 2. Atomically decrement stock + create order
    try {
      const order = await this.orderService.fulfillOrder(
        input.items,
        paymentResult.transactionId ?? input.transactionId
      );
      return { success: true, order };
    } catch (err) {
      const message =
        err instanceof Error && err.message === "INSUFFICIENT_STOCK"
          ? "Algunos volúmenes ya no tienen stock disponible"
          : "Error al procesar el pedido";
      return { success: false, errorMessage: message };
    }
  }
}
