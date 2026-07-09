# Changelog

## v3.1 — Join tabs + wizard polish (2026-07)

- **Physical join tabs for multi-piece assemblies** — `splitTemplateAtCandidate` now generates a real glue-tab polygon extending outward from the join edge along the split line. The tab is added as a `Tab` (cut line), `FoldLine` (fold), and `Annotation` (label) to one assembly, while the matching assembly gets a receiving-edge instruction label
- **Tab re-balancing** — `tryMultiPieceLayout` checks if Assembly A fits with the tab; if not, `moveJoinTabToAssembly` reassigns the tab to Assembly B and retries. If neither fits, the next split candidate is tried
- **`moveJoinTabToAssembly`** — new helper in `layout/index.ts` that transfers a join tab (and its cut path / fold line / annotations) from one part to the other, recomputing both parts' bounds and swapping labels
- **Validation moved into wizard** — the standalone bottom-of-page `ValidationPanel` is replaced by a collapsible Issues section inside the wizard card, between step content and nav buttons. Auto-expands when new issues appear. Shows "✓ No issues" or error/warning count
- **Auto-advance fix** — shape/style/material auto-advance `useEffect`s now use `useRef` guards to only fire when the tracked value actually changes, not when the user navigates to the step via the stepper
- **Button `:active` states** — `active:scale-[0.97] active:brightness-90` on `buttonVariants`; `.style-card:active`, `.wizard-step:active` scale transforms with smooth transition
- **Preview SVG `max-height: 50vh`** — prevents tall templates from pushing the layout off-screen
- **Duplicate export buttons removed** — only one set of PDF/SVG buttons in the wizard footer
- All 169 tests pass (36 files)

## v3.0 — Multi-piece layout + inline validation (2026-07)

- **Multi-piece layout engine** — when a one-piece net exceeds the printable area, `layoutTemplate` now tries to split the template along a fold line into two assemblies. Each assembly fits within the printable area with join labels included (closes #1)
- **`splitTemplateAtCandidate`** — new function in `layout/index.ts` that partitions a single-part `TemplateItem` into a two-part template using the existing `splitCandidates` (fold lines) with cross-product side detection
- **`LayoutType`** — new field on `LayoutResult` (`'single-piece' | 'multi-piece' | 'overflow'`) with `assemblyCount`; the status bar and wizard now show distinct states
- **Inline wizard validation** — `BoxWizard` now shows a status badge (Fits / Multi-piece / Blocked) between the stepper and step content, with a color-coded border (green/amber/red) and descriptive text
- **Export button tooltips** — PDF/SVG/Add-to-Queue buttons show the first blocking error in their `title` attribute when disabled
- **PDF assembly labels + join indicators** — multi-piece layouts render "Assembly A"/"Assembly B" labels and "<- Join ->" indicators on each page
- **Small-box splitting confirmed** — a 4" × 2.5" × 1.4" glue-tab carton (101.6 × 63.5 × 35.56 mm, 330 mm strip net) on US Letter now produces a valid 2-assembly printable layout instead of reporting overflow
- New test file: `tests/unit/layout/multi-piece.test.ts`
- All 169 tests pass (36 files)

## v2.1 — Polish & Export workflow (2026-07)

- **A1** — `glueTabWidth` excluded from generic dimension validation; uses dedicated `tab-too-small` warning at 6mm threshold
- **A2** — Overlap detection uses exclusive segment intersection with epsilon (`1e-10`); added `pointInPolygon` containment check — eliminates false positives from shared boundary edges
- **A3** — Net generators respect `input.glueTabWidthMm` via `glueTabWidth()` helper with percentage fallback `max(W × 0.18, 10)`
- **B1** — Glue-tab-carton defaults to strip-only topology; Front/Back never adjacent. Cross and T-layout still selectable for tuck-carton
- **C1–C4** — Wizard overflow guards: 2-column grid (`1fr 20rem`), right panel scroll, panel-grid min-width reduced to 9rem, stepper `flex-wrap`
- **D1–D3** — Queue moved from fixed 16rem left column to collapsible bottom drawer (toggled via header bar); batch PDF button in header
- **E1–E4** — Wizard reduced from 7 to 6 steps (queue step removed); "Add to Queue" moved to preview step footer; PDF/SVG export buttons always visible in wizard footer
- Updated README layout description; all 168 tests pass

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
