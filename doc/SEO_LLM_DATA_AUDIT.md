# Nightfalls SEO, LLM Search, and Data Product Audit

## Current read

Nightfalls has outgrown the original "sunset time predictor" framing. The app
now behaves more like a sunset photography planning tool: it forecasts sunset
quality, compares saved map pins, recommends nearby viewpoints, and separates
golden hour, sun disk, Belt of Venus, civil twilight, and blue hour use cases.

## Implemented in this pass

- Tightened the recommendation call strategy so map movement must settle before
  location discovery runs.
- Added a minimum movement threshold before fetching new recommendations.
- Split recommendation filters into sunset phase, location type, and scene
  qualities.
- Updated global metadata to mention viewpoint recommendations, blue hour, and
  sunset photography planning.
- Expanded WebApplication structured data with the new recommendation and phase
  features.
- Added `public/llms.txt` to give LLM crawlers a concise product summary and
  canonical app URLs.

## API cost and cache notes

The recommendation API should be called only when:

- the map has a known center;
- the user has stopped moving the map for the settle window;
- the settled center moved far enough from the previous recommendation center;
- the 15-minute client cache does not already contain that rounded lat/lon key;
- the server-side cache does not already contain the same rounded query.

This keeps casual map panning from causing burst traffic. The current client
rounding plus 15-minute cache is appropriate for a free app POC. The next
database-backed version should persist stable spot candidates by geohash or
rounded grid cell, then run expensive validation/enrichment on a slower cadence.

## SEO audit

Strengths:

- App has global metadata, OpenGraph, Twitter cards, sitemap, FAQ content, and
  structured data.
- The domain language already targets "sunset times", "golden hour", "sunset
  predictions", and "sunset photography".
- `/App` is the clear product route and the sitemap exposes major static pages.

Gaps:

- The home page still reads like a generic predictor, while the product is now a
  planner plus recommender.
- There are no indexable location pages for high-intent searches like "best
  sunset spots in Vancouver" or "golden hour Vancouver tonight".
- The app route is mostly client-rendered, so recommendation results are not
  visible to crawlers.
- Brand visuals and copy still feel like an early utility rather than a refined
  photography planning product.

## LLM search audit

Strengths:

- The product has explainable categories and a concise `llms.txt` surface.
- Structured data now names phase-specific planning and viewpoint discovery.

Gaps:

- There is no canonical prose page explaining the scoring model in a stable,
  citation-like way.
- Recommendation data is not exposed as durable pages, JSON snapshots, or
  region summaries that answer engines can quote.
- The FAQ should be expanded with phase-specific questions: Belt of Venus, blue
  hour, civil twilight, and how viewpoint scoring works.

## Data product audit

Strengths:

- Candidate discovery now has live map signals, validated fallbacks, scoring,
  phase metrics, and short-lived cache protection.
- The UI makes recommended spots inspectable and user-actionable.

Gaps:

- Spots are still treated as ephemeral recommendation results rather than
  durable entities with review history, source provenance, and performance over
  time.
- Reference photos are not yet stored as first-class attribution-safe assets.
- There is no feedback loop for users to confirm, dismiss, or rate a spot.

## Recommended revamp phases

1. Product positioning:
   Reframe Nightfalls as "a sunset photography planner" across home, app, FAQ,
   metadata, and onboarding. Keep "sunset predictor" as a search phrase, but
   not the only identity.

2. Region landing pages:
   Add crawlable pages for priority regions such as Vancouver, Surrey,
   Coquitlam, Burnaby, Richmond, and North Vancouver. Each page should include
   top recommended spot types, sunset phases, seasonal notes, and a CTA into
   the map.

3. Durable spot database:
   Persist discovered spot candidates by stable id, grid/geohash, source,
   features, phase scores, and last validation timestamp. Use the API route for
   live refresh only when cached data is stale.

4. Feedback and validation:
   Let users mark spots as promising, not useful, blocked/private, or photo
   verified. Use that feedback to adjust ranking and create a validation set.

5. Visual rebrand:
   Move away from broad pink/purple gradient utility styling toward a calmer
   photography field-guide aesthetic: map-first, denser controls, strong
   image/reference moments, and copy centered on planning a shoot.

## Suggested next implementation step

Add the first crawlable region page template and seed it with Vancouver-area
recommendation language. That gives SEO and LLM search a durable surface while
the app continues to use live recommendations for interaction.
