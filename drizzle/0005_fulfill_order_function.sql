CREATE OR REPLACE FUNCTION fulfill_order(
  p_transaction_id text,
  p_total_amount real,
  p_item_count integer,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_updated_count integer;
BEGIN
  -- 1. Create the order
  INSERT INTO orders (niubiz_transaction_id, status, total_amount, item_count)
  VALUES (p_transaction_id, 'completed', p_total_amount, p_item_count)
  RETURNING id INTO v_order_id;

  -- 2. For each item: decrement stock + insert order_item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Atomic decrement with row-level lock; CHECK(stock >= 0) prevents oversell
    UPDATE inventory
    SET stock = stock - (v_item->>'quantity')::int,
        updated_at = now()
    WHERE volume_id = (v_item->>'volume_id')::uuid
      AND stock >= (v_item->>'quantity')::int;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
      -- Check if it's dropshippable
      IF NOT EXISTS (
        SELECT 1 FROM inventory
        WHERE volume_id = (v_item->>'volume_id')::uuid
          AND can_be_dropshipped = true
      ) THEN
        RAISE EXCEPTION 'Insufficient stock for volume %', v_item->>'volume_id';
      END IF;
      -- Dropshippable item: no stock decrement needed
    END IF;

    INSERT INTO order_items (order_id, volume_id, title, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'volume_id')::uuid,
      v_item->>'title',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::real
    );
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;
