export interface PaymentSession {
  sessionToken: string;
  merchantId: string;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface AuthorizeTransactionInput {
  transactionToken: string;
  merchantId: string;
  purchaseNumber: string;
  amount: number;
  currency?: string;
}

export interface IPaymentProvider {
  createSession(
    amount: number,
    orderId: string
  ): Promise<PaymentSession>;
  authorizeTransaction(
    input: AuthorizeTransactionInput
  ): Promise<PaymentResult>;
}
