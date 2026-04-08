import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

async function main() {
  // 1. Check pending orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, expires_at, created_at")
    .eq("status", "pending");
  console.log("Pending orders:", JSON.stringify(orders, null, 2));

  // 2. Force-release each pending order
  for (const order of orders ?? []) {
    const { data, error } = await supabase.rpc("release_reservation", {
      p_order_id: order.id,
    });
    console.log(`Release ${order.id}:`, data, error);
  }

  // 3. Check pending again
  const { data: after } = await supabase
    .from("orders")
    .select("id, status, expires_at, created_at")
    .eq("status", "pending");
  console.log("Pending after release:", JSON.stringify(after, null, 2));
}

main();
