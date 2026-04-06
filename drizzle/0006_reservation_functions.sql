-- Replace fulfill_order with reservation-based flow
DROP FUNCTION IF EXISTS fulfill_order(text, real, integer, jsonb);
DROP FUNCTION IF EXISTS confirm_order(uuid, text);
DROP FUNCTION IF EXISTS release_reservation(uuid);
DROP FUNCTION IF EXISTS cleanup_expired_reservations();
DROP FUNCTION IF EXISTS reserve_stock(real, integer, jsonb, integer);

-- ── Reserve stock ────────────────────────────────────
-- Atomically decrements stock and creates a pending order with TTL.
-- Returns the order_id + expires_at. Rolls back if any item lacks stock.
CREATE OR REPLACE FUNCTION reserve_stock(
  p_total_amount real,
  p_item_count integer,
  p_items jsonb,
  p_ttl_seconds integer DEFAULT 180
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_expires_at timestamptz;
  v_item jsonb;
  v_updated_count integer;
BEGIN
  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  INSERT INTO orders (status, total_amount, item_count, expires_at)
  VALUES ('pending', p_total_amount, p_item_count, v_expires_at)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Atomic decrement; CHECK(stock >= 0) is the safety net
    UPDATE inventory
    SET stock = stock - (v_item->>'quantity')::int,
        updated_at = now()
    WHERE volume_id = (v_item->>'volume_id')::uuid
      AND stock >= (v_item->>'quantity')::int;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM inventory
        WHERE volume_id = (v_item->>'volume_id')::uuid
          AND can_be_dropshipped = true
      ) THEN
        RAISE EXCEPTION 'Insufficient stock for volume %', v_item->>'volume_id';
      END IF;
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

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- ── Confirm order ────────────────────────────────────
-- Marks a pending (non-expired) order as completed with the Niubiz txn ID.
CREATE OR REPLACE FUNCTION confirm_order(
  p_order_id uuid,
  p_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE orders
  SET status = 'completed',
      niubiz_transaction_id = p_transaction_id,
      expires_at = NULL
  WHERE id = p_order_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Order % is expired or not pending', p_order_id;
  END IF;

  RETURN jsonb_build_object('confirmed', true);
END;
$$;

-- ── Release reservation ──────────────────────────────
-- Restores stock for a pending order and marks it expired.
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

  -- Restore stock for each item
  FOR v_item IN
    SELECT volume_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE inventory
    SET stock = stock + v_item.quantity,
        updated_at = now()
    WHERE volume_id = v_item.volume_id;
  END LOOP;

  UPDATE orders SET status = 'expired' WHERE id = p_order_id;

  RETURN jsonb_build_object('released', true);
END;
$$;

-- ── Cleanup expired reservations ─────────────────────
-- Call periodically (e.g. pg_cron or on-demand) to release abandoned orders.
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
      SELECT volume_id, quantity FROM order_items WHERE order_id = v_order.id
    LOOP
      UPDATE inventory
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE volume_id = v_item.volume_id;
    END LOOP;

    UPDATE orders SET status = 'expired' WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('expired_count', v_count);
END;
$$;
