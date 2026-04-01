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

export interface IPaymentProvider {
  createSession(
    amount: number,
    orderId: string
  ): Promise<PaymentSession>;
  verifyTransaction(
    transactionId: string,
    merchantId: string
  ): Promise<PaymentResult>;
}
