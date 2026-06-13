# Nightfalls UX Revamp Spec

## Product Definition

Nightfalls is a sunset photography planning app. The core workflow is:

1. Choose an area.
2. Understand whether the sky is worth chasing.
3. Compare saved pins and recommended viewpoints.
4. Pick the best sunset phase for each place.
5. Leave with a simple plan: when to arrive, where to stand, and what to shoot.

## Why the Old UI Felt Dated

- The homepage was built around a broad gradient hero and generic "sunset
  predictor" language before the product had spot recommendations.
- The app had two separate mental models: predictions and map scouting. It did
  not explain when a user should use each.
- Recommendation details were accurate but visually dense, making the map panel
  feel like an internal scoring debugger.
- Cards, pills, and pages used inconsistent color, spacing, iconography, and
  text density.
- SEO pages and app pages had different visual languages.

## Design Direction

Adopt a sunset photography field-guide aesthetic:

- calm, map-first, practical, and editorial;
- tactile warm paper surfaces balanced with sunset-native accents;
- orange, pink, and purple are the expressive palette for action, phase, and
  quality cues;
- use gradients as accents, dividers, badges, and active states rather than as
  a full-page wash over operational UI;
- compact controls and denser information where users compare options;
- more prose only on crawlable guide/FAQ pages where search context matters.
- prefer icons for optional controls, with tooltip/title text on hover where a
  label would add clutter.

## User Stories

- As a photographer, I want to know which phase a spot is best for so I can
  decide whether to shoot golden hour, the sun disk, Belt of Venus, or blue hour.
- As a casual user, I want one obvious action after choosing a location so I do
  not need to understand every metric first.
- As a map user, I want recommendations to update only after I stop moving the
  map so the app feels intentional and does not waste API calls.
- As a scout, I want filters grouped by phase, place type, and scene quality so
  I can narrow the map without reading every result.
- As a search visitor, I want local guide pages that answer "where should I go"
  before asking me to open the app.

## Information Architecture

Condense:

- prediction cards should lead with score, date, golden hour, sunset, and one
  short interpretation;
- recommendation cards should show name, total score, best phase, and 1-3
  qualities;
- map controls should remain compact and utilitarian.

Expand:

- region guide pages should include searchable context, top phases, and ranked
  viewpoint explanations;
- FAQ should explain phases, scoring, and why recommendations differ by place;
- selected spot details should show phase metrics and viewing direction.

## Component System

- `nf-shell`: app/page shell with field-guide background.
- `nf-panel`: bounded working panel for planner sections and sidebars.
- `nf-card`: compact repeated item surface.
- `nf-chip`: filter/status token.
- `nf-button-primary`, `nf-button-secondary`: consistent action styling.
- `nf-section-label`: small uppercase label for product context.
- `nf-score`: score badge with stable dimensions.

## Color Tokens

- Ink: `#191714`
- Paper: `#f4f1ea`
- Raised paper: `#fffaf2`
- Sunset orange: `#f97316`
- Sunset pink: `#ec4899`
- Twilight purple: `#7c3aed`
- Deep plum: `#2f1b45`
- Mist: `#d2ddd8`
- Night: `#151515`
- Night panel: `#211f1c`

## Acceptance Criteria

- Main navigation, footer, home, app shell, FAQ, and region pages share one
  visual language.
- App workflow explains predictions vs map scouting without tutorial text.
- Recommendation filters remain split by phase, location type, and scene
  quality.
- Build and TypeScript pass.
