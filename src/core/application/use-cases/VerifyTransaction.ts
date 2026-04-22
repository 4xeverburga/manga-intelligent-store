import type {
  IPaymentProvider,
  PaymentResult,
} from "@/core/domain/ports/IPaymentProvider";

interface Input {
  transactionToken: string;
  merchantId: string;
  purchaseNumber: string;
  amount: number;
}

export class VerifyTransaction {
  constructor(private paymentProvider: IPaymentProvider) {}

  async execute(input: Input): Promise<PaymentResult> {
    return this.paymentProvider.authorizeTransaction(input);
  }
}
