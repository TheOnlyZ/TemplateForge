# Changelog

## UI v2 — Tailwind + shadcn + 3-column layout (2026-07)

- Installed Tailwind v4 + `@tailwindcss/vite`, set up CSS-based `@theme` block mapping existing design tokens
- Adopted shadcn/ui-style components: Button, Card, Input, Select, Badge — all migrated from CSS modules to Tailwind utility classes with zero-import-change re-exports
- Deleted `Button.module.css`, `Card.module.css`, `Input.module.css`, `Select.module.css`, `Badge.module.css`
- Restructured layout from 2-column to 3-column grid: queue (left, 16rem) / canvas (center, 1fr) / wizard (right, 22rem)
- Moved ValidationPanel to a full-width bar below the grid
- Collapsed preview stages from side-by-side to stacked vertically
- Added overflow guards: card header badge `flex-shrink: 0`, workspace `overflow-x: hidden`, assembly text `text-overflow: ellipsis`
- Pruned README architecture tree, moved roadmap to CHANGELOG

## Revision 2 — UI Overhaul (2026-06)

- Refined design tokens: solid `--bg` (`#0b1119`), `--surface-hover`, `--text-muted`, `--ring`, `--shadow-*`, `--transition`; removed radial-gradient body background
- Built 6 component primitives: Button, Card, Input, Select, Badge, Stepper with CSS modules
- Decomposed monolithic workspace: extracted Toolbar, QueueSection, ValidationPanel from 724-line page (now ~235 lines)
- Reorganised CSS: deleted App.css, split into layout.css, BoxWizard.css, TemplatePreview.css, AssemblyView.css; all CSS modules use scoped class names
- Wizard cleanup: replaced numbered-step list with `<Stepper>`, raw inputs with `<Input>`/`<Select>`, shortened labels
- Visual polish: 150ms transitions, focus rings, card hover lift, reduced border opacity (12% vs 15%)

## Revision 1 — Net Geometry Model (2026-05)

- Introduced layered `Net`/`Face`/`GlueTab`/`Flap`/`Fold` interfaces in `src/domain/geometry/net.ts`
- Ported net generators (`buildStripNet`, `buildCrossNet`, `buildTNetCarton`) to produce typed `Net` with all 6 faces structural
- Flap overlap filtered via `nonOverlappingFlaps`; fold `direction` annotated on all 18 fold sites
- Open-tray converted to Net model with 4 corner glue tabs
- `validateNet` performs 8 checks: face count, dimensions, names, duplicates, glue-tab attachment, overlap, fold-graph connectivity
- `netToTemplateItem` decouples net generation from rendering — SVG/PDF renderers consume flat `TemplateItem[]`

## Phase 7 — Expanded Shape Library (2026-04)

- Cones and truncated cones
- Polygonal prisms
- Tubes and sleeves
- Drawer and telescoping boxes
- Custom parametric shapes

## Phase 6 — Interactive Assembly (2026-03)

- 3D assembly view with finished-object, exploded, and sequence modes
- Face-to-template bidirectional highlighting
- Animated assembly sequence with folding guidance
- Part identification and page mapping
- Cylinder assembly view (finished + exploded)

## Phase 5 — Project Workspace (2026-03)

- Queue multiple shapes into a single project
- Batch PDF generation
- Optimised page nesting to reduce paper usage
- Save, reopen, duplicate, and edit projects

## Phase 4 — Multi-Net Layout (2026-02)

- Intelligent net selection — tries all network topologies
- Single-page placement with no tiling
- Validation errors on overflow instead of multi-page oversizing

## Phase 3 — Advanced Template Generation (2026-02)

- Cylinder, cone, prism, tube, drawer, and custom parametric generators
- Multi-net box unfolding (strip, cross, T-layout)
- Letter, Legal, and A4 paper support
- Automatic page orientation selection

## Phase 2 — First Shape Support (2026-01)

- Parametric rectangular box generator
- Glue-tab, tuck-carton, and tray box styles
- Live SVG template preview
- True-scale vector PDF export
- Print calibration rulers and scale verification

## Phase 1 — Foundation (2026-01)

- React + TypeScript + Vite project setup
- Shape-agnostic geometry architecture
- Unit conversion and print-tolerance rules
- Paper definitions and printable-area calculations
- Validation framework for template constraints

## Initial commit (2026-01)

- Project scaffold with React 19, Vite, TypeScript, Vitest
- Basic box geometry and SVG preview renderer
