import type { IOrderService, StockCheckResult } from "@/core/domain/ports/IOrderService";
import type { OrderItem } from "@/core/domain/entities/Order";

interface Input {
  items: Pick<OrderItem, "volumeId" | "title" | "quantity">[];
}

export class ValidateStock {
  constructor(private orderService: IOrderService) {}

  async execute(input: Input): Promise<StockCheckResult[]> {
    return this.orderService.validateStock(input.items);
  }
}
