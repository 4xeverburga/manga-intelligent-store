export interface OrderItem {
  volumeId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  niubizTransactionId: string | null;
  status: "pending" | "completed" | "failed" | "expired";
  totalAmount: number;
  itemCount: number;
  items: OrderItem[];
  email: string | null;
  phone: string | null;
  deliveryAddress: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}
