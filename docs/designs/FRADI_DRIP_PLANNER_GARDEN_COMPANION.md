# FRADI Drip Planner — Garden Companion Prototype

Generated on 2026-04-26
Branch: `emiltharris/drip-irrigation-v2`
Status: Archived design artifact

## What this is

A mobile-only click-through prototype of the 7-screen FRADI worker intake flow:
plot size → soil/slope/water direction → water source → water clarity → water tank
→ crops → confirm. One phone shell, vanilla JS screen switcher, hash-based deep
linking (`#step-N`), Pretext for prose blocks. No framework, no build step.

The earlier desktop-framed start-screen showcase is preserved in git history at
commit `69900465` (`archive FRADI Garden Companion design prototype`). That artifact
has been replaced because the active need is a walkthrough of the actual intake
surface, not a marketing frame around a single home screen.

The tracked artifact lives here so the branch has a durable, shareable copy of the
design outside `.context/` and outside the local `~/.gstack/projects/...` output
directory used by the design skills.

## Files

- [`fradi-worker-intake-start-garden-companion.html`](./fradi-worker-intake-start-garden-companion.html)
- [`fradi-worker-intake-start-garden-companion.json`](./fradi-worker-intake-start-garden-companion.json)

## Source provenance

- Initial exploration came from `design-shotgun` on the FRADI intake concept.
- The selected direction was then finalized as production-style standalone HTML/CSS.
- Original generated source path:
  `/Users/emiltetzner-harris/.gstack/projects/garrytan-gstack/designs/fradi-worker-intake-start-20260426/`

## Notable UI choices

- One phone shell visible at a time on a clean cream backdrop. No marketing chrome,
  no decorative dot overlay or radial halos, no gradient flourishes on the brand mark
  or icon tiles. Flat color + soft shadow on the CTA only.
- Top bar = back arrow + `Step N of 7` progress label. Sticky bottom CTA, disabled
  until the screen's required selections are valid.
- Pictogram-first tap tiles for soil, slope, water source/distance/height, clarity,
  tank type, language. Single-select rows with selected-state outline + tinted fill.
- A 4-arrow compass rose for water-flow direction (replaces a dropdown).
- Steppers (− N +) for jerry-cans-per-day (with `≈ X litres` derived label, 20 L per
  can) and tank capacity.
- 3-column multi-select grid for crops with a live "N selected" counter beside the
  CTA on screen 6.
- Final screen is the only one with a free-text input (gardener name) plus language
  tap cards and a placeholder photo tile.
- Hash routing (`#step-1` … `#step-7`) for refresh stability and deep-linking.
- Selection state is in-memory only — this is a visual prototype, not a wired app.
  Tapping "Generate plan" on screen 7 fires a transient "Saved on device" toast and
  loops back to screen 1 so the demo stays clickable.
- Dark mode, reduced-motion handling, and focus-visible rings preserved.

## Why this is tracked as docs

The current workspace is the `gstack` repo, not a dedicated FRADI application repo.
Until the planner moves into its own product codebase, the least misleading way to
preserve the artifact is as a design document plus standalone prototype under
`docs/designs/`.
