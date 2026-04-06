import type {
  IPaymentProvider,
  PaymentSession,
} from "@/core/domain/ports/IPaymentProvider";

interface Input {
  amount: number;
  orderId: string;
}

export class CreateCheckoutSession {
  constructor(private paymentProvider: IPaymentProvider) {}

  async execute(input: Input): Promise<PaymentSession> {
    return this.paymentProvider.createSession(input.amount, input.orderId);
  }
}
