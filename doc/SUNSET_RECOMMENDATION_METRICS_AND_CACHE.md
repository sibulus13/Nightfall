# Sunset Recommendation Metrics and Cache Strategy

## Core Metrics

Each recommended spot should be evaluated as a multivariate proposal, not a single point on the map. The current POC now exposes these metrics per candidate:

| Metric | Meaning | Why It Matters |
| --- | --- | --- |
| Phase fit | How well the spot works across golden hour, reflections, foreground, and vantage signals | Helps choose spots for the current lighting window |
| View quality | Combined estimate of open horizon, elevation, water, and visual usefulness | Main signal for whether a place is worth visiting |
| Direction fit | Whether the place likely faces the sunset or has panoramic/water exposure | Important for golden hour and sun disk shots |
| Sky color potential | Scenic/atmospheric suitability inferred from place type and tags | Helps rank beaches, viewpoints, water, and parks |
| Foreground interest | Whether the spot offers bridges, skyline, trees, boats, water, mountains, or landmarks | Better photos need subjects, not just sky |
| Reflection potential | Whether water is likely available for sunset or blue-hour reflection shots | Strong for beaches, lakes, rivers, marinas, piers |
| Access confidence | Public access signal | Avoid recommending places that may be private or impractical |
| Source confidence | Whether a spot has known/local reference support | Helps separate known spots from scout-worthy suggestions |

These metrics are returned in `recommendationMetrics` and can later feed phase-specific recommendations.

## Queryable Tags

Each candidate also returns `searchTags`, which are meant to be user-facing filters. Examples:

- Beach
- Park
- Water Reflection
- Wide Horizon
- High Vantage
- Western Exposure
- Foreground Interest
- Seasonal Scout

The UI uses these tags as filter pills so users can quickly isolate the type of sunset experience they want.

## Cache Strategy

The discovery feature has two cache layers:

1. Client cache in `localStorage`
   - Keyed by rounded latitude, rounded longitude, radius, and limit.
   - TTL: 15 minutes.
   - Avoids repeat app/API calls when a user moves away and comes back to the same map area.

2. Server memory cache
   - Same rounded-location strategy.
   - TTL: 15 minutes.
   - Avoids repeated Overpass/Wikipedia calls across users hitting the same area during a short window.

This is enough for a POC and protects the free external APIs from bursts.

## Database Upgrade Path

Once the feature is stable, move from process memory to Supabase/Postgres:

```sql
create table sunset_spot_cache (
  cache_key text primary key,
  center_lat numeric not null,
  center_lon numeric not null,
  radius_meters int not null,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sunset_spot_cache_expires_at_idx
  on sunset_spot_cache (expires_at);
```

Recommended behavior:

- Read cache first.
- If fresh, return cached recommendations.
- If stale, return stale data immediately and refresh in the background later.
- Delete expired rows daily.
- Keep cache rows anonymous and area-based, not user-specific.

## Cost Balance

Current request pattern per uncached area:

- Overpass high-confidence pass: 1 request.
- Overpass broad-scenic pass: 0-1 request, depending on whether enough results were found.
- Wikipedia image enrichment: only for candidates with Wikipedia-backed references.
- SunCalc: local CPU only, no API cost.
- Local fallback seeds: no API cost.

Practical cost posture:

- Most map movements should hit client cache.
- Repeated nearby users should hit server/database cache.
- External calls should happen only on first request per rounded area per 15 minutes.
- Google Places photos should stay out of the default path until there is a budget or paid tier.

## Recommended Next Step

Add phase-specific scores on top of these same metrics:

- Golden hour
- Sun disk
- Belt of Venus
- Civil twilight
- Blue hour

The current metrics are intentionally reusable for those phase scores.

