-- ── match_mangas ─────────────────────────────────────────────────────────────
-- Vector similarity search against mangas.embedding.
CREATE OR REPLACE FUNCTION match_mangas(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  jikan_id int,
  title text,
  synopsis text,
  genres text[],
  image_url text,
  score real,
  popularity int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.jikan_id,
    m.title,
    m.synopsis,
    m.genres,
    m.image_url,
    m.score,
    m.popularity,
    1 - (m.embedding <=> query_embedding)::float AS similarity
  FROM mangas m
  WHERE m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── reserve_stock ─────────────────────────────────────────────────────────────
-- Atomically decrements stock and creates a pending order with TTL.
-- Returns order_id + expires_at. Rolls back if any item lacks stock.
-- Dropshippable volumes may exceed stock by up to 3 units; only available
-- stock is decremented and tracked in reserved_from_stock.
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
BEGIN
  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  INSERT INTO orders (status, total_amount, item_count, expires_at)
  VALUES ('pending', p_total_amount, p_item_count, v_expires_at)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_requested := (v_item->>'quantity')::int;

    SELECT stock INTO v_available
    FROM inventory
    WHERE volume_id = (v_item->>'volume_id')::uuid
    FOR UPDATE;

    IF v_available IS NULL THEN
      RAISE EXCEPTION 'Volume % not found in inventory', v_item->>'volume_id';
    END IF;

    IF v_available >= v_requested THEN
      v_to_decrement := v_requested;
    ELSE
      IF EXISTS (
        SELECT 1 FROM inventory
        WHERE volume_id = (v_item->>'volume_id')::uuid
          AND can_be_dropshipped = true
      ) THEN
        IF (v_requested - v_available) > 3 THEN
          RAISE EXCEPTION 'DROPSHIP_LIMIT_EXCEEDED::%::%::%', v_item->>'volume_id', v_available, v_requested;
        END IF;
        v_to_decrement := v_available;
      ELSE
        RAISE EXCEPTION 'INSUFFICIENT_STOCK::%', v_item->>'volume_id';
      END IF;
    END IF;

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

-- ── confirm_order ─────────────────────────────────────────────────────────────
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

-- ── release_reservation ───────────────────────────────────────────────────────
-- Restores only the stock that was actually decremented, then marks the order expired.
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

-- ── cleanup_expired_reservations ──────────────────────────────────────────────
-- Called by pg_cron every minute to release abandoned pending orders.
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
