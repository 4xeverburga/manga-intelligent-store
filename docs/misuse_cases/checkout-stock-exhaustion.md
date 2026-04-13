# Misuse Case: Stock Exhaustion via Reserve Endpoint

## Summary

An unauthenticated attacker can lock the entire store inventory by sending
a single `POST /api/checkout/reserve` request containing every volume in
the catalogue, making the store appear out-of-stock for legitimate buyers.

## Attack Vector

```
POST /api/checkout/reserve
Content-Type: application/json

{
  "items": [
    { "volumeId": "<uuid-1>", "title": "x", "quantity": 999 },
    { "volumeId": "<uuid-2>", "title": "x", "quantity": 999 },
    ...
  ]
}
```

The attacker can discover all volume UUIDs via `GET /api/mangas` or the
public catalogue page.

### Why It Works

| Check                     | Exists? | Notes                                         |
| ------------------------- | ------- | --------------------------------------------- |
| Auth required              | ❌      | Endpoint is fully anonymous                   |
| Max items per order        | ❌      | No cap on `items.length`                      |
| Max quantity per item      | ❌      | Only bounded by physical stock                |
| Rate limiting (IP)         | ❌      | No throttle on reserve calls                  |
| Max pending orders per IP  | ❌      | Can create unlimited concurrent reservations  |

The `reserve_stock` PL/pgSQL function loops over `jsonb_array_elements(p_items)`
with no upper bound. Each call atomically locks stock via `SELECT ... FOR UPDATE`
and creates a pending order with a 5-minute TTL.

## Impact

- **Denial of Service (inventory):** All stock locked → real customers see
  "Stock insuficiente" for up to 5 minutes per attack cycle.
- **Perpetual lockout:** Attacker re-sends every 4 minutes → store is
  permanently unavailable.
- **Financial loss:** Lost sales during lockout window. No real payment
  is required to trigger the reservation.

## Current Mitigations

1. **TTL auto-expire (5 min):** `cleanup_expired_reservations()` pg_cron
   job runs every 60 s. Stock recovers after expiry.
2. **INSUFFICIENT_STOCK exception:** Prevents reserving more than
   available stock per volume (but does not limit total items per order).

## Recommended Countermeasures

| Countermeasure                         | Effort | Effectiveness |
| -------------------------------------- | ------ | ------------- |
| Cap items per order (e.g. 10 volumes)  | Low    | Medium        |
| Cap quantity per item (e.g. 3 units)   | Low    | Medium        |
| IP-based rate limiting (3 req / 5 min) | Medium | High          |
| Max pending orders per IP              | Medium | High          |
| CAPTCHA / proof-of-work before reserve | High   | Very High     |
| Require authentication to reserve      | Medium | High          |

## STRIDE Classification

- **Denial of Service** — inventory unavailability
- **Elevation of Privilege** — anonymous access to stock-locking operation

## Related

- `POST /api/checkout/reserve` → [src/app/api/checkout/reserve/route.ts](../../src/app/api/checkout/reserve/route.ts)
- `reserve_stock()` PL/pgSQL → [drizzle/0001_functions.sql](../../drizzle/0001_functions.sql)
- `cleanup_expired_reservations()` → [drizzle/0002_cron.sql](../../drizzle/0002_cron.sql)
