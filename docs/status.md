# Project Status

## Done

- [x] Initialized status tracking structure in `docs/status.md`.
- [x] Stock count displayed in catalogue volume list (consistent with cart sidebar style).
- [x] Post-purchase success screen shows email confirmation notice.
- [x] Consolidated agent instructions: merged `.github/copilot-instructions.md` into root `AGENTS.md`.

## Pending

- [ ] Implement email confirmation after successful purchase (send order receipt + tracking info) **[{Backend}]**
- [ ] Implement order tracking flow per email instructions **[{Backend}]**
- [ ] On any screen except the dashboard page, clicking an item to add it to cart must auto-open the cart side tab (no need to click the cart icon) **[{Frontend}]**
- [ ] Implement a configurable temperature parameter for the LLM model **[{AI}]**

## Risks / Blockers

- [ ] Status tracking has just been initialized; historical completed tasks are not yet backfilled.
- [ ] Email provider not yet selected — needed before mail integration can start.

## Next Milestone

Deliver email confirmation on purchase: users receive an order receipt with tracking instructions after a successful checkout.

## Team Ownership

| Owner | Scope |
|---|---|
| Frontend | UI interactions and layout behavior |
| Backend | API routes, use cases, payment, email integration |
| AI | LLM chat, recommendations, profile extraction |
