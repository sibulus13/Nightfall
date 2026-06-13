# UI Implementation Audit

## Verdict

The current UI is usable and more coherent than the original gradient-heavy
implementation, but it is not yet where the Nightfalls product should land. It
has the right product direction, but the styling is still only partially
systematized.

## What Was Wrong

- Navigation had duplicate intent: both "Scout" and "Planner" opened `/App`.
- Shared chrome still used one-off hex colors instead of design tokens.
- The old scrollbar retained the previous purple visual identity.
- Global CSS applied unnecessary border color overrides to every element.
- Page-level surfaces still contain too many copied color values.
- The app route explains the workflow, but the planner header can be more
  compact once the user has selected a location.

## Available Hooks

- `frontend-design` skill: product/UI design direction.
- `orchestrate` skill: build, typecheck, smoke, and audit verification loop.
- `scripts/visual-smoke.mjs`: static/live rendered route marker checks.
- `scripts/design-audit.mjs`: duplicate nav, mojibake, and hard-coded color
  audit.
- `nf-sunset-band`, `nf-icon-button`, and sunset-gradient `nf-button-primary`
  provide the first reusable sunset-palette primitives.

## Current Metrics

- Duplicate `/App` nav actions: fixed.
- Mojibake in app/component text: fixed.
- Hard-coded hex colors in `src/app` and `src/components`: currently audited
  by `scripts/design-audit.mjs`.
- Static route smoke coverage: `/`, `/App`, `/locations/vancouver-bc`, `/FAQ`,
  `/llms.txt`.

## Layered Refactor Plan

1. Shared chrome:
   Completed. Navbar/footer now use tokens/utilities instead of page-specific
   palettes.

2. Page shell:
   Convert homepage, FAQ, and region guides from hard-coded colors to
   `nf-*` primitives.

3. Planner work surface:
   Make the planner header collapsible/compact after location selection. Keep
   map and forecast as the main work area.

4. Recommendation panel:
   Convert all filter/list/detail styling to `nf-chip`, `nf-card`, `nf-score`,
   and token-based states.

5. Browser verification:
   Add Playwright or another screenshot runner once dependency installation is
   approved.

## Design Philosophy

Keep it simple and almost obvious:

- one primary action per surface;
- operational UI should be quiet and dense;
- use orange, pink, and purple as the sunset accent system;
- prefer icon controls plus hover/title/tooltips for optional actions;
- explanatory UI belongs on guides and FAQ, not inside repeated controls;
- detail is revealed, not dumped;
- every styling primitive should earn its place.
