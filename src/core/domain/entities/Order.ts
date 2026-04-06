export interface OrderItem {
  volumeId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  niubizTransactionId: string | null;
  status: "pending" | "completed" | "failed";
  totalAmount: number;
  itemCount: number;
  items: OrderItem[];
  createdAt: Date;
}
