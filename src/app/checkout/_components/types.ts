export type CheckoutStatus = "reserved" | "paying" | "success" | "expired";

export type StockMap = Record<
  string,
  { stock: number; canBeDropshipped: boolean }
>;

declare global {
  interface Window {
    VisanetCheckout?: {
      configure(config: Record<string, unknown>): void;
      open(): void;
    };
  }
}
