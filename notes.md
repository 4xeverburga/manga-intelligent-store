# Gemini API — Available Models & Free Tier Limits

> Source: https://ai.google.dev/gemini-api/docs/pricing (April 2026)
> Rate limits vary by tier. Check yours at: https://aistudio.google.com/rate-limit

## Text generation models (support `generateContent`)

| Model String | Free Tier | Function Calling | Status | Notes |
|---|---|---|---|---|
| `gemini-3.1-pro-preview` | **No free tier** | Yes | Preview | Best quality, agentic + vibe coding |
| `gemini-3.1-flash-lite-preview` | **Free** | Yes | Preview | Cheapest Gemini 3 model |
| `gemini-3-flash-preview` | **Free** | Yes | Preview | Best Gemini 3 flash, frontier intelligence |
| `gemini-2.5-pro` | **Free** | Yes | Stable | Advanced reasoning, coding |
| `gemini-2.5-flash` | **Free** (20 RPD free tier) | Yes | Stable | Best price-performance, thinking model |
| `gemini-2.5-flash-lite` | **Free** | Yes | Stable | Fastest, most budget-friendly 2.5 |
| `gemini-2.0-flash` | **Free** | Yes | **Deprecated** (shutdown June 1, 2026) | Good fallback, high free tier limits |
| `gemini-2.0-flash-lite` | **Free** | Yes | **Deprecated** (shutdown June 1, 2026) | Fastest 2.0, cheapest |

## Recommended for this project

### Primary: `gemini-3-flash-preview`
- Free tier, frontier intelligence, function calling supported
- Preview model (may change)

### Fallbacks (in order):
1. `gemini-2.5-flash-lite` — Free, stable, fast, cheap
2. `gemini-2.5-flash` — Free (but only ~20 RPD on free tier!), reasoning model
3. `gemini-2.0-flash` — Free, high limits, but deprecated (dies June 2026)

## Free Tier Caveats
- Rate limits are per-project, not per-key
- RPD (requests per day) resets at midnight Pacific time
- Free tier: content used to improve Google products
- Exact RPM/RPD vary — check https://aistudio.google.com/rate-limit for your project
- `gemini-2.5-flash` free tier is notably low (~20 RPD for `generate_content`)

## Embedding models
| Model String | Free Tier | Notes |
|---|---|---|
| `gemini-embedding-001` | Free | Text-only embeddings |
| `gemini-embedding-2-preview` | Free | Multimodal (text, image, video, audio, PDF) |


Modelo	Free Tier (RPD)	Calidad
gemini-2.0-flash	~1500/día	Muy bueno, rápido
gemini-2.0-flash-lite	~1500/día	Más rápido, menos preciso
gemini-1.5-flash	~1500/día	Bueno, estable
gemini-2.5-flash	20/día	El mejor, pero casi nada gratis



usuarios 


mal
- https://myanimelist.net/profile/4verburga


reddit
- https://www.reddit.com/user/Ever4_



Ok cool. Next we have to keep memory of the chat conversation. If i get out of the app/ path should i come back i should see my chat. There should be a button to restart the conversation after a limit of 20 message turns has been done. I think the chat is stateful right? I mean the messages from the start of the conversation are remembered by the agent. If that is so, then we need to add a lenght limit. 
