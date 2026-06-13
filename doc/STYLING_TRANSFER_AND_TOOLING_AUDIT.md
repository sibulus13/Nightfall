# Styling Transfer and Tooling Audit

## Verdict

The current UI should not keep expanding by hand-coded one-off page styling.
Nightfalls needs a design-token pass first, then component replacement in the
highest-friction surfaces: navigation, homepage hero, planner toolbar,
recommendation panel, and map marker popups.

## Available Local Hooks

- `frontend-design` skill: best for product-level visual direction, layout
  critique, and cohesive component implementation.
- `orchestrate` skill: best for action-biased implementation plus build,
  smoke, and audit verification.
- `vercel:shadcn` skill: best for adding or refactoring Radix/shadcn
  primitives already present in `src/components/ui`.
- `vercel:verification` skill: best once a dev server is available and browser
  verification can inspect the full route.
- Existing scripts: `scripts/design-audit.mjs` and `scripts/visual-smoke.mjs`.

## External Tools Worth Plugging In

- shadcn theming: use CSS variables and semantic tokens instead of page-level
  hardcoded colors. The current app already has token wiring, but too many
  components bypass it.
- shadcn MCP/registries: install/search shadcn blocks through an assistant
  workflow when the MCP server is configured. This is the cleanest way to bring
  in better primitives without inventing a private component system too early.
- shadcn Figma kits: useful if we want a real design source of truth before
  implementation. Prefer a free shadcn-aligned kit first; paid kits only matter
  if we want broad block coverage.
- v0: useful for screenshot-to-UI and Figma/mockup-to-React iterations. Best
  use is generating candidate component treatments, then hand-porting the
  chosen pattern into this repo's tokens and data contracts.
- Vercel Marketplace testing/analytics: Checkly or Autonoma can provide
  browser route checks; PostHog or Vercel Web Analytics can show where users
  fall off; Sentry can catch frontend runtime failures.
- Vercel Marketplace web automation/search: Firecrawl, Browserbase, Kernel, or
  Parallel are more relevant to sunset location discovery than visual styling,
  but they can support future location-reference validation workflows.

## Recommended Styling Transfer Path

1. Freeze the product grammar:
   - sunset palette: orange, pink, purple;
   - warm paper surfaces and dark night surfaces;
   - icons with tooltips for optional actions;
   - dense operational UI in the planner, expressive atmosphere on the home
     page only.
2. Reduce hardcoded colors:
   - move repeated orange/pink/purple/paper/night colors into CSS variables;
   - keep gradients for active/selected states, not every container.
3. Add a small set of missing shadcn primitives:
   - `badge`, `popover`, `hover-card`, `sheet`, `separator`, `skeleton`;
   - use them for marker popups, filter chips, mobile controls, and loading
     states.
4. Use v0 or a Figma kit for one route at a time:
   - start with `/App`, because it is the true product surface;
   - provide screenshots of current route plus this design contract;
   - port only the winning component patterns back into local code.
5. Add browser-based visual verification:
   - desktop/mobile screenshots for `/`, `/App`, `/locations/vancouver-bc`,
     and `/FAQ`;
   - check no horizontal overflow, no hidden map controls, and no overlapping
     text in nav/toolbars/popups.

## Immediate UI Decision

The public API waitlist should remain available, but it needs to behave like a
secondary product surface rather than a rough lead-capture page. Keep `/Api-doc`
discoverable, style the form with the Nightfalls component language, and make
the copy clear that API access is future-facing while the planner remains the
primary product.

## Sources Reviewed

- Vercel Marketplace: https://vercel.com/marketplace
- v0 docs: https://v0.app/docs
- shadcn theming: https://ui.shadcn.com/docs/theming
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- shadcn Figma: https://ui.shadcn.com/docs/figma
