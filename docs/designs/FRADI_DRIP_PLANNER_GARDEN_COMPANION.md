# FRADI Drip Planner — Garden Companion Prototype

Generated on 2026-04-26
Branch: `emiltharris/drip-irrigation-v2`
Status: Archived design artifact

## What this is

This branch includes an imported standalone HTML prototype for the FRADI worker-facing
intake start screen. The design direction is `Garden Companion`: a mobile-first,
pictogram-led shell for an offline-capable drip-irrigation intake flow used by a
FRADI staff member in the field.

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

## Notable UI choices preserved in the prototype

- Large outdoor-friendly primary action
- Pictogram-first quick actions for low-text scanning
- Recent drafts and workshop queue surfaces
- Language cards for multilingual field use
- Responsive desktop framing around a phone-first interaction model
- Dark mode, reduced-motion handling, and focus-visible states

## Why this is tracked as docs

The current workspace is the `gstack` repo, not a dedicated FRADI application repo.
Until the planner moves into its own product codebase, the least misleading way to
preserve the artifact is as a design document plus standalone prototype under
`docs/designs/`.
