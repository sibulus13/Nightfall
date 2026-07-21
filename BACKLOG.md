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
