-- Fix reserve/release stock inflation bug:
-- Track actual stock decremented per order item, only restore that amount on release.

-- 1. Add tracking column
ALTER TABLE order_items ADD COLUMN reserved_from_stock integer NOT NULL DEFAULT 0;

-- 2. Fix reserve_stock: always decrement min(stock, quantity) for dropshippable items
CREATE OR REPLACE FUNCTION reserve_stock(
  p_total_amount real,
  p_item_count integer,
  p_items jsonb,
  p_ttl_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_expires_at timestamptz;
  v_item jsonb;
  v_requested int;
  v_available int;
  v_to_decrement int;
  v_updated_count integer;
BEGIN
  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  INSERT INTO orders (status, total_amount, item_count, expires_at)
  VALUES ('pending', p_total_amount, p_item_count, v_expires_at)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_requested := (v_item->>'quantity')::int;

    -- Get current stock
    SELECT stock INTO v_available
    FROM inventory
    WHERE volume_id = (v_item->>'volume_id')::uuid
    FOR UPDATE;

    IF v_available IS NULL THEN
      RAISE EXCEPTION 'Volume % not found in inventory', v_item->>'volume_id';
    END IF;

    IF v_available >= v_requested THEN
      -- Enough stock: decrement full amount
      v_to_decrement := v_requested;
    ELSE
      -- Not enough stock: check if dropshippable
      IF EXISTS (
        SELECT 1 FROM inventory
        WHERE volume_id = (v_item->>'volume_id')::uuid
          AND can_be_dropshipped = true
      ) THEN
        -- Dropshippable: max 3 units can be ordered beyond stock
        IF (v_requested - v_available) > 3 THEN
          RAISE EXCEPTION 'DROPSHIP_LIMIT_EXCEEDED::%::%::%', v_item->>'volume_id', v_available, v_requested;
        END IF;
        v_to_decrement := v_available;
      ELSE
        RAISE EXCEPTION 'INSUFFICIENT_STOCK::%', v_item->>'volume_id';
      END IF;
    END IF;

    -- Decrement only what we're actually taking
    IF v_to_decrement > 0 THEN
      UPDATE inventory
      SET stock = stock - v_to_decrement,
          updated_at = now()
      WHERE volume_id = (v_item->>'volume_id')::uuid;
    END IF;

    INSERT INTO order_items (order_id, volume_id, title, quantity, unit_price, reserved_from_stock)
    VALUES (
      v_order_id,
      (v_item->>'volume_id')::uuid,
      v_item->>'title',
      v_requested,
      (v_item->>'unit_price')::real,
      v_to_decrement
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- 3. Fix release_reservation: only restore what was actually decremented
CREATE OR REPLACE FUNCTION release_reservation(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_item record;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_found');
  END IF;

  IF v_status <> 'pending' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_pending');
  END IF;

  -- Restore only the stock that was actually decremented
  FOR v_item IN
    SELECT volume_id, reserved_from_stock FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.reserved_from_stock > 0 THEN
      UPDATE inventory
      SET stock = stock + v_item.reserved_from_stock,
          updated_at = now()
      WHERE volume_id = v_item.volume_id;
    END IF;
  END LOOP;

  UPDATE orders SET status = 'expired' WHERE id = p_order_id;

  RETURN jsonb_build_object('released', true);
END;
$$;

-- 4. Fix cleanup_expired_reservations: same fix
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_item record;
  v_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT id FROM orders
    WHERE status = 'pending' AND expires_at < now()
  LOOP
    FOR v_item IN
      SELECT volume_id, reserved_from_stock FROM order_items WHERE order_id = v_order.id
    LOOP
      IF v_item.reserved_from_stock > 0 THEN
        UPDATE inventory
        SET stock = stock + v_item.reserved_from_stock,
            updated_at = now()
        WHERE volume_id = v_item.volume_id;
      END IF;
    END LOOP;

    UPDATE orders SET status = 'expired' WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('expired_count', v_count);
END;
$$;
