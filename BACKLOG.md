# Backlog — future scope

Ideas parked for later, not yet scheduled.

## Discover: browse-all spots + hidden gems page

A dedicated **spots directory** — a list and/or standalone page that surfaces
*every* discovered spot for an area (not just the top handful shown in the
planner), plus "hidden" locations the recommendation algorithm rates highly but
that don't surface today (lower-popularity but strong terrain/phase fit).

- **List view:** all candidate spots for the current area, ranked by the current
  recommendation algorithm (terrain view-quality + phase fit + popularity),
  filterable by phase / location type / scene quality.
- **Page view:** a shareable/indexable page per area (SEO-friendly, like the
  existing `/locations/[slug]` guides) listing the full ranked set.
- **"Unlock hidden spots":** deliberately include algorithm-strong but
  low-popularity candidates that the top-N planner list trims, so users can
  discover under-the-radar viewpoints.
- Reuses the existing `discoverSunsetLocations` pipeline + ranking; the delta is
  presentation (full set vs top-N) and a browsable surface.

_Logged 2026-07-20 during the discovery-followups session._

---

## Information architecture: is `/App` the real homepage?

Today `/` is a marketing hero and `/App` is the planner; a returning-visitor
cookie already redirects `/` → `/App`. Question: should `/App` just *be* the
homepage?

- **Recommendation:** keep both but clarify roles. `/` stays the SEO/marketing
  landing (indexable, hero, guides) for first-touch + search traffic; `/App` is
  the product. Consider making `/App` the default for known users (already
  half-done via the cookie) and tightening `/` to funnel into the planner faster.
- Ties into the header/nav item below — the "Open planner" CTA and the active-nav
  treatment should follow from whichever IA we pick.

## Mobile + desktop interactivity parity (no hover on mobile)

The new pressable affordances (filter pills, phase timeline) lean on `:hover`,
which **doesn't exist on touch**. Ensure the app feels equally interactive on
mobile.

- **Recommendation:** make selection legible from resting + `:active` state alone
  (filled colour, ✓, scale) so hover is a desktop enhancement, not the only
  signal. Audit tap targets for ≥44px, add `active:` press feedback everywhere,
  and verify the one-viewport layout + map gestures on real devices.
- Check the phase timeline / pills specifically — their affordance is currently
  hover-weighted.

## Ensure every sunset phase has ≥1 recommended spot

Some phases surface zero spots (the "best spot for phase X" can be empty when no
candidate scores well for it), leaving gaps in the timeline.

- **Options:**
  1. **Guaranteed fill (lenient fallback):** if a phase has no qualifying spot,
     surface the best *available* spot for it even below threshold, clearly
     marked as a softer suggestion.
  2. **Widen discovery** for under-served phases (larger radius / relaxed terrain
     gate) only when a phase comes up empty.
  3. **Honest empty state:** explicitly say "no strong spot for the Belt of Venus
     here — try a clearer eastern horizon nearby."
- **Recommendation:** (1) with a visible "best available" tag — never a hard
  empty for a phase, but don't misrepresent a weak spot as strong. Reuses the
  existing per-phase ranking (`phaseScores`); the delta is the fallback pick +
  labelling.

## MCP: rate limiting, auth for power users, usage tracking

Current state: `/api/mcp` is an unauthenticated, hand-rolled JSON-RPC endpoint
(3 tools) with the same in-memory per-IP rate limiter as the other routes.

- **Rate limiting:** in-memory limiter is per-instance only — swap to Upstash/KV
  for real multi-instance limits in prod (already flagged for the other routes).
- **Authentication for power users:** add API keys (per-key rate tiers) so heavy
  programmatic users are identified + throttled independently; MCP spec supports
  auth headers. Gate higher limits / more tools behind a key.
- **Usage tracking (both apps + MCP):**
  - Web app: confirm analytics coverage — `@vercel/analytics` is wired, plus GA
    via `NEXT_PUBLIC_GOOGLE_TAG_ID`. Verify events beyond pageviews (search,
    spot select, predict).
  - MCP / programmatic: log per-tool, per-key call counts + latency (structured
    logs → a dashboard or KV counters). Nothing tracks MCP usage today.
- **Recommendation:** sequence = KV rate limiter → API keys → per-key usage
  metrics. Do it before promoting the MCP endpoint publicly.

## Visual system: button hierarchy + gradient overuse

The sunset gradient is applied to *many* buttons (CTAs, Miko, send, etc.), which
dilutes it — when everything is the hero colour, nothing is.

- **Recommendation:** define a small token system — **one** primary/core-action
  colour (the gradient reserved for the single most important action per view,
  e.g. "Open planner" / "Predict"), a **secondary** (outline/neutral) for
  supporting actions, and an **accent** for selection/highlight. Demote most
  gradient buttons to secondary. One core action button per screen.
- Codify in `tailwind.config` tokens + the shadcn `Button` variants (already have
  `default`/`outline`/`ghost`) so it's enforced, not per-component.

## Header / nav cleanup + active-page state

- The **"Planner" page header** (the big "Choose the sky, then choose the place")
  belongs on the hero/landing; on the planner page it should be **simplified**
  (it costs vertical space against the one-viewport goal).
- **"Open planner" CTA:** when already on `/App`, hide it or fold it into the
  nav (it's redundant there).
- **Active-nav highlight:** the current page should be visibly marked in the
  navbar (usePathname → active style) so users know where they are without
  reading the URL.
- **Recommendation:** all three together as a small "nav/IA polish" pass —
  low-risk, high-legibility, and reclaims planner viewport space.

_Items above logged 2026-07-20 at session close (post-panel-consolidation)._
