# Nightfalls Wireframes and Design System

## Design Verdict

The current implementation is directionally better than the original gradient
landing page, but it is not yet a fully proper product design. The main issues:

- Navigation has duplicate intent: "Scout" and "Planner" both open `/App`.
- Several pages use the field-guide aesthetic, but the implementation still has
  hard-coded colors and page-specific styling instead of reusable primitives.
- The app route begins with useful context, but it still consumes too much
  vertical space before the user's actual work surface.
- The map panel still mixes old shadcn defaults, custom field-guide styling, and
  legacy comments/classes.
- Verification exists, but it is static smoke testing rather than screenshot or
  interaction testing.

## Available Design Hooks

- `frontend-design` skill: used for product visual direction and quality bar.
- `orchestrate` skill: used for build/typecheck/static render verification.
- `scripts/visual-smoke.mjs`: local hook for static or live route smoke tests.
- `scripts/design-audit.mjs`: local hook for duplicate actions, mojibake, and
  color-system drift.
- Existing local UI primitives: `Button`, `Card`, `DropdownMenu`, `Tooltip`.

Browser screenshot automation is not currently available in this session, and
Playwright/Puppeteer are not installed. The next design hook should be a real
browser visual test runner once dependency installation is approved.

## Wireframe 1: Home

Purpose: explain the product in one screen and start the planner.

```
Nav: Brand | Guides FAQ API | Open Planner

Hero:
  Label: Sunset photography planner
  H1: Plan the shot before the sky changes.
  Copy: forecast + scouting + phase fit
  Search/location input
  Primary: Open Planner
  Secondary: Browse Guides

Right rail:
  Phase cards: Golden hour, Sun disk, Belt of Venus, Blue hour

Below fold:
  Three simple cards: Forecast sky / Scout place / Match phase
  Region guide cards
```

Condense: phase cards, three product principles.
Expand: local guides and SEO-friendly region explanations.

## Wireframe 2: Planner

Purpose: choose a location, decide if the sky is worth it, then scout.

```
Compact header:
  Title: Choose the sky, then choose the place.
  Search/location input

Segmented control:
  Forecast | Map

Forecast tab:
  6 forecast cards
  Each card: date, score, golden hour, sunset, compact condition label
  Click: reveal 4-6 metrics
  Click again: open Map tab for that day

Map tab:
  Toolbar: date selector, predict, clear, marker count
  Left: full map
  Right: recommendations
```

Condense: weather metric details and explanatory copy.
Expand: selected recommendation details on the map marker popup.

## Wireframe 3: Recommendation Panel

Purpose: filter, compare, select, add to predictions.

```
Header:
  Recommended spots
  Source note

Filters:
  Phase
  Location type
  Scene qualities

List:
  Icon | name
  Notable quality | best phase

Selected map marker:
  Type/quality icon
  Best phase + arrival guidance
  1-2 badges
  Add to predictions
```

Condense: source diagnostics, score math, phase metric grids, and viewing
azimuths.
Expand: only the selected spot's practical next action on the marker popup.

Map marker contract:

- markers use a sunset gradient plus a lucide icon for the strongest cue;
- water/reflection spots use waves, elevation/viewpoints use mountain,
  trails use footprints, parks use trees, landmarks use landmark, twilight
  qualities use sparkles, and composition-heavy spots use aperture;
- selected markers scale and show an anchored popup instead of increasing map
  padding or opening a bottom detail block.

Atmosphere easter egg:

- the homepage can tint the hero with a stronger orange/pink/purple sunset
  gradient when the visitor is near local sunset;
- use already-granted browser location when available, otherwise fall back to
  Vancouver coordinates only for the `America/Vancouver` timezone;
- do not make an API call or show a geolocation prompt for this effect.

## Wireframe 4: Region Guides

Purpose: be crawlable and useful before the app loads.

```
Guide header:
  Best sunset spots in {region}
  Summary
  Open this area in the app

Fast read panel:
  Top pick
  Strongest phases
  Common qualities

Ranked viewpoints:
  Score, phase fit, qualities, viewing direction
```

## Component Library Contract

Use shared primitives first:

- `nf-shell`: page background and text color.
- `nf-page`: max-width page container.
- `nf-panel`: bounded working surface.
- `nf-card`: repeated item surface.
- `nf-chip`: status/filter token.
- `nf-button-primary`: primary action.
- `nf-button-secondary`: secondary action.
- `nf-section-label`: section metadata label.
- `nf-score`: fixed-size score badge.
- `nf-sunset-band`: thin orange-pink-purple accent.
- `nf-icon-button`: square icon control for optional actions.

Palette preference:

- orange for primary action and warm light;
- pink for sky color potential and atmosphere;
- purple for twilight, Belt of Venus, and afterglow;
- warm paper and dark night surfaces for quiet operational structure;
- gradients should appear as accents and active states, not as full-screen
  decoration behind dense tools.

Interaction preference:

- prefer icon controls for secondary actions;
- every icon-only control must have `aria-label` and `title`, or a real tooltip
  when rendered inside a `TooltipProvider`;
- explanations should be hidden in hover/tooltips unless they are required for
  SEO or first-time route context.

Avoid:

- duplicate primary actions to the same destination;
- page-specific one-off color palettes;
- large gradients behind operational UI;
- visible tutorial copy where a label or control hierarchy is enough;
- cards inside cards unless the inner item is a repeated data item.

## Next Hook

Add a browser visual test when dependencies can be installed:

- render `/`, `/App?lat=49.2827&lon=-123.1207&tab=map`,
  `/locations/vancouver-bc`, and `/FAQ`;
- capture desktop and mobile screenshots;
- assert no horizontal overflow, no blank map area when key is present, and no
  text overlap in nav, hero, forecast cards, or recommendation filters.
