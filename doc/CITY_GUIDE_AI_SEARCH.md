# City Guide AI Search

## Decision

City guide search is implemented as an AI-optional feature:

- user selects a city with the same Google Places locator used by the planner;
- the server discovers nearby sunset candidates using the existing location
  discovery pipeline;
- Gemini can enrich the guide copy when `GEMINI_API_KEY` is configured;
- deterministic fallback copy is returned when no key is present, rate limits
  are hit, the provider fails, or JSON parsing fails.

## Provider Review

- Gemini API is the best free-first candidate for this feature. Google documents
  Free, Tier 1, Tier 2, and Tier 3 rate-limit tiers; free limits are tied to an
  active project or free trial, and Gemini rate limits are measured by RPM, TPM,
  and RPD.
- Gemini 2.5 Flash-Lite is positioned as the smallest and most cost-effective
  Gemini model, which fits short structured city guide copy.
- xAI/Grok is useful but less suitable for a free app default right now because
  the official docs list per-token pricing for Grok 4.3 and Grok Build, and do
  not expose an obvious free API tier in the pricing page.

## Cache Strategy

- Browser localStorage caches guides by city slug and rounded coordinates for
  repeat visitors.
- Server memory cache avoids repeat generation for hot city requests while the
  process is warm.
- Underlying sunset spot discovery already caches Overpass/location discovery
  results for 15 minutes.
- City guides expire after seven days because public sunset viewpoints are
  usually stable while copy and ranking can improve over time.

## Persistence Upgrade

The current POC avoids requiring a paid database. For production persistence,
add a `city_guides` table in Supabase or MongoDB with:

- `cache_key` unique text;
- `city_name`, `latitude`, `longitude`;
- `guide_json`;
- `provider`, `generated_at`, `expires_at`;
- feedback counters `thumbs_up`, `thumbs_down`.

Use the database before the server memory cache, then regenerate only on misses
or expired records.

## Live Feedback

The UI includes thumbs-up/thumbs-down feedback. The POC route stores aggregate
counts in process memory. Production should persist this in the same
`city_guides` table or a separate `city_guide_feedback` event table.

## Sources

- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- xAI models: https://docs.x.ai/developers/models
- xAI pricing: https://docs.x.ai/developers/pricing
