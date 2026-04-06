import type {
  IPaymentProvider,
  PaymentResult,
} from "@/core/domain/ports/IPaymentProvider";

interface Input {
  transactionId: string;
  merchantId: string;
}

export class VerifyTransaction {
  constructor(private paymentProvider: IPaymentProvider) {}

  async execute(input: Input): Promise<PaymentResult> {
    return this.paymentProvider.verifyTransaction(
      input.transactionId,
      input.merchantId
    );
  }
}
