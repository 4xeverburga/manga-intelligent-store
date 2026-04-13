# Misuse Case: Repeated Reservation Spam (Griefing)

## Summary

An attacker repeatedly calls `POST /api/checkout/reserve` in a loop,
creating many small overlapping reservations that collectively exhaust
stock. Even if each individual order is modest, the cumulative effect
denies inventory to real buyers.

## Attack Vector

```bash
# Rapid-fire small reservations — harder to distinguish from real traffic
while true; do
  curl -s -X POST https://target.com/api/checkout/reserve \
    -H "Content-Type: application/json" \
    -d '{"items":[{"volumeId":"<popular-uuid>","title":"x","quantity":1}]}'
done
```

Unlike the single-request exhaustion attack, this approach:

- Mimics legitimate traffic (single item, qty 1)
- Spreads across many orders → harder to detect per-order
- Can target only popular / low-stock volumes for maximum impact

### Why It Works

| Check                     | Exists? | Notes                                          |
| ------------------------- | ------- | ---------------------------------------------- |
| Auth required              | ❌      | Anonymous access                               |
| Rate limiting (IP)         | ❌      | Unlimited calls per second                     |
| Max pending orders per IP  | ❌      | Each call creates a new 5-min reservation      |
| Bot detection              | ❌      | No CAPTCHA, fingerprint, or proof-of-work      |

The `reserve_stock` function performs `SELECT stock ... FOR UPDATE` which
serializes concurrent calls. However, each call that succeeds creates a new
pending order that holds stock for 5 minutes. A bot can exhaust a volume
with stock=10 in under a second by sending 10 sequential requests.

## Impact

- **Targeted denial:** Specific popular volumes become unavailable.
- **Hard to detect:** Individual requests look legitimate — small cart,
  qty 1, valid volume ID.
- **Sustained disruption:** Attacker repeats every 4 min to keep stock
  locked perpetually.
- **pg_cron race:** Cleanup runs every 60 s; attacker can create
  60+ reservations between cleanup cycles.

## Current Mitigations

1. **TTL auto-expire (5 min):** Stock recovers after order expiry.
2. **pg_cron cleanup (every 60 s):** Releases expired pending orders.
3. **Stock check:** `INSUFFICIENT_STOCK` prevents over-reserving a single
   volume beyond available stock.

## Recommended Countermeasures

| Countermeasure                               | Effort | Effectiveness |
| -------------------------------------------- | ------ | ------------- |
| IP-based rate limiting (3 req / 5 min)       | Medium | High          |
| Max pending orders per IP (e.g. 2)           | Medium | High          |
| Sliding window + exponential back-off        | Medium | High          |
| CAPTCHA on checkout initiation               | High   | Very High     |
| Device fingerprinting                        | High   | Medium        |
| Require email verification before reserving  | Medium | High          |

## STRIDE Classification

- **Denial of Service** — inventory unavailability via accumulated reservations
- **Spoofing** — anonymous requests with no identity verification

## Difference from Single-Request Exhaustion

| Aspect       | Single-Request Exhaustion             | Repeated Reservation Spam         |
| ------------ | ------------------------------------- | --------------------------------- |
| Requests     | 1 (all volumes in one cart)           | Many small requests               |
| Detection    | Obvious (huge payload)                | Harder (mimics real traffic)      |
| Fix          | Cap items/qty per order               | Rate limiting + max pending       |
| Sophistication | Low                                 | Slightly higher                   |

## Related

- `POST /api/checkout/reserve` → [src/app/api/checkout/reserve/route.ts](../../src/app/api/checkout/reserve/route.ts)
- `reserve_stock()` PL/pgSQL → [drizzle/0001_functions.sql](../../drizzle/0001_functions.sql)
- `cleanup_expired_reservations()` → [drizzle/0002_cron.sql](../../drizzle/0002_cron.sql)
- Related: [Stock Exhaustion via Reserve](checkout-stock-exhaustion.md)
