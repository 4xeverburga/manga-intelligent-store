# Project Status

## Done

- [x] Browser tab icon now uses the Kekeros isotype from `public/` instead of the default framework icon.
- [x] Chat assistant now uses the branded icon asset in the message avatar.
- [x] Chat messages now render with `react-markdown` instead of the fragile regex formatter, fixing Markdown bullets and inline formatting.
- [x] Stock count displayed in catalogue volume list (consistent with cart sidebar style).
- [x] Post-purchase success screen shows email confirmation notice.
- [x] Configurable temperature parameter for the LLM model — now part of the Bot Variant system (`BotVariant` entity + `BotVariantRegistry` adapter).
- [x] Bot Variant architecture: domain entity, port interface (`IBotVariantRegistry`), and registry adapter as single source of truth for model config.
- [x] Chat error handling: stream errors displayed in UI, `AI_RetryError` statusCode extraction, styled error messages.
- [x] Manga tool results rendered as horizontal carousel with improved card layout.
- [x] Vector search limits and thresholds parametrized via environment variables.
- [x] Chat tool search params delegated to use cases (clean architecture alignment).
- [x] Test card env vars and hint displayed from config on checkout page.
- [x] Evaluation framework: scenarios and tests for manga cart functionality (Vitest + AI SDK v6).
- [x] Config refactor: exported env singleton, removed per-call `validateEnv()` usage.

## Pending

- [ ] Implement email confirmation after successful purchase (send order receipt + tracking info) **[{Backend}]**
- [ ] Implement order tracking flow per email instructions **[{Backend}]**
- [ ] On any screen except the dashboard page, clicking an item to add it to cart must auto-open the cart side tab (no need to click the cart icon) **[{Frontend}]**

## Risks / Blockers

- [ ] Email provider not yet selected — needed before mail integration can start.

## Next Milestone

Deliver email confirmation on purchase: users receive an order receipt with tracking instructions after a successful checkout.

## Team Ownership

| Owner | Scope |
|---|---|
| Frontend | UI interactions and layout behavior |
| Backend | API routes, use cases, payment, email integration |
| AI | LLM chat, recommendations, bot variants, profile extraction |
