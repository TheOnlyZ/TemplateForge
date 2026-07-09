# TemplateForge

## What is TemplateForge?
TemplateForge is a browser-based parametric template designer that generates true-scale, print-ready PDF templates for boxes, cylinders, cones, prisms, and other physical objects, complete with multi-net layout optimisation and interactive 3D assembly guidance.

## Why does it exist?
One day, I wanted to check if a charger would fit neatly into a small case that I intended to keep cables, port hubs, and the like in. Rather than painstakingly measure out the template on paper with a ruler and then cut, I thought to give a few LLMs a try to see how well they could create accurate, ready-to-print templates. Alas, they failed in various ways, and this spurred me to create a simple web application that can achieve that end with a few additional features.

## Key features

- 📐 Generate true-scale printable templates from finished dimensions
- 📦 Rectangular boxes (glue-tab, tuck-carton, open-tray)
- 🛢️ Cylinders with glue tabs and alignment tabs
- 🔺 Cones, truncated cones, polygonal prisms, tubes, sleeves, drawer boxes
- 🧩 Multi-net layout engine — tries strip, cross, and T-layout unfoldings
- 🖨️ Automatic layout optimisation for Letter, Legal, A4, and other paper sizes
- 📄 Export print-ready vector PDFs with calibration rulers
- 👁️ Live 2D template preview synchronised with 3D assembly view
- 🔄 Finished-object, exploded, and step-by-step assembly modes
- 📚 Queue and batch multiple shapes into a single optimised print job
- 🔄 Bilingual Imperial / Metric input
- 📁 Project persistence — save, reopen, duplicate, edit

## Installation

```bash
npm install
npm run dev        # development server
npm run test:run   # run test suite
npm run build      # production build
```

## Architecture

The project is organised as a strict React + TypeScript + Vite application:

```
src/
├── components/           — shared UI primitives (Button, Card, Input, Select, Badge, Stepper)
│   ├── Button.tsx        — primary, secondary, ghost variants
│   ├── Card.tsx          — header/body/footer sections
│   ├── Input.tsx         — labelled input with focus ring
│   ├── Select.tsx        — labelled select with chevron
│   ├── Badge.tsx         — coloured tags with optional dot indicator
│   └── Stepper.tsx       — horizontal step indicator
├── domain/
│   ├── geometry/         — reusable 2D primitives (points, bounds, paths)
│   │   └── net.ts        — Face, GlueTab, Flap, Fold, Net interfaces
│   ├── paper/            — paper definitions, printable-area calculations
│   ├── units/            — unit conversion, imperial/metric formatting
│   ├── validation/       — input, geometry, layout, and net validation rules
│   │   └── net.ts        — validateNet (face count, dimensions, labels, overlap, fold graph)
│   ├── templates/        — shape-agnostic template model
│   ├── shapes/
│   │   ├── box/
│   │   │   ├── index.ts        — generateBoxTemplate, helpers
│   │   │   ├── nets.ts         — net-type dispatch
│   │   │   ├── net-geometry.ts — buildStripNet, buildCrossNet, buildTNetCarton
│   │   │   └── net-converter.ts— Net → TemplateItem converter
│   │   ├── cylinder/
│   │   ├── cone/
│   │   ├── polygonal-prism/
│   │   ├── tube-sleeve/
│   │   ├── drawer-telescoping/
│   │   └── custom-parametric/
│   ├── materials/        — material definitions and guidance
│   └── layout/           — single-page placement, no tiling
├── store/                — Zustand app state (draft, queue, preferences)
├── features/
│   ├── workspace/
│   │   ├── WorkspacePage.tsx    — main page (orchestrator, ~235 lines)
│   │   ├── Toolbar.tsx          — compact title + unit toggle + save/open
│   │   ├── QueueSection.tsx     — queue items list with actions
│   │   └── ValidationPanel.tsx  — validation messages with severity badges
│   ├── wizard/           — step-by-step shape wizard
│   │   └── box-wizard/
│   │       └── BoxWizard.tsx    — 7-step wizard with Stepper, Input, Select
│   ├── assembly/         — 3D assembly model and SVG views
│   ├── preview/          — SVG template preview component
│   ├── export/           — download helpers
│   └── project/          — serialisation / persistence
├── renderers/
│   ├── pdf/              — PDF document generation (pdf-lib)
│   └── svg/              — SVG export (preview + file)
├── styles/
│   └── layout.css        — app-shell (global layout)
├── index.css             — design tokens (colours, spacing, type scale, radii, shadows)
└── App.tsx               — imports global CSS + feature CSS
```

## Current Status

The implementation is complete through all seven original roadmap phases plus two major revision passes.

### Net Geometry Model (Revision 1)
- Layered `Net` / `Face` / `GlueTab` / `Flap` / `Fold` interfaces in `src/domain/geometry/net.ts`
- Each net generator (`buildStripNet`, `buildCrossNet`, `buildTNetCarton`) produces a typed `Net` with all 6 faces structural — Front/Back = L×H, Left/Right = W×H, Top/Bottom = L×W
- Glue tabs are separate auxiliary geometry with validated attachment edges; labels derive from geometry role
- `validateNet` performs 8 checks: face count (tray=5, carton=6), dimensions, names, duplicates, glue-tab attachment, overlap detection, fold-graph connectivity
- `netToTemplateItem` decouples net generation from rendering — SVG/PDF renderers consume flat `TemplateItem[]`

### UI Overhaul (Revision 2)
- **Design tokens refined** — solid `--bg` (#0b1119), `--surface-hover`, `--text-muted`, `--ring`, `--shadow-sm/md/lg`, `--transition` token; removed radial-gradient body background
- **6 component primitives** — `Button`, `Card`, `Input`, `Select`, `Badge`, `Stepper` with CSS modules under `src/components/`
- **Workspace decomposed** — `Toolbar`, `QueueSection`, `ValidationPanel` extracted from the monolithic 724-line `WorkspacePage.tsx` (now ~235 lines)
- **CSS reorganised** — `App.css` deleted; styles split into `layout.css`, `BoxWizard.css`, `TemplatePreview.css`, `AssemblyView.css`; all CSS modules use scoped class names
- **Wizard cleanup** — replaced numbered-step list with `<Stepper>`, raw inputs with `<Input>`/`<Select>`, shortened labels, removed verbose helper text
- **Visual polish** — 150ms transitions on interactive elements, focus rings (`--ring` token), card hover lift, reduced border opacity (`--border` at 12% instead of 15%)

### Test Coverage
- 153 unit tests across 34 test files
- Tests for all shape generators, net generators, net validation, layout engine, component rendering (React Testing Library), store, persistence, and PDF/SVG export

## Roadmap

### Phase 1 — Foundation ✅
- React + TypeScript + Vite project setup
- Shape-agnostic geometry architecture
- Unit conversion and print-tolerance rules
- Paper definitions and printable-area calculations
- Validation framework for template constraints

### Phase 2 — First Shape Support ✅
- Parametric rectangular box generator
- Glue-tab, tuck-carton, and tray box styles
- Live SVG template preview
- True-scale vector PDF export
- Print calibration rulers and scale verification

### Phase 3 — Advanced Template Generation ✅
- Cylinder, cone, prism, tube, drawer, and custom parametric generators
- Multi-net box unfolding (strip, cross, T-layout)
- Letter, Legal, and A4 paper support
- Automatic page orientation selection

### Phase 4 — Multi-Net Layout ✅
- Intelligent net selection — tries all network topologies
- Single-page placement with no tiling
- Validation errors on overflow instead of multi-page oversizing

### Phase 5 — Project Workspace ✅
- Queue multiple shapes into a single project
- Batch PDF generation
- Optimised page nesting to reduce paper usage
- Save, reopen, duplicate, and edit projects

### Phase 6 — Interactive Assembly ✅
- 3D assembly view with finished-object, exploded, and sequence modes
- Face-to-template bidirectional highlighting
- Animated assembly sequence with folding guidance
- Part identification and page mapping
- Cylinder assembly view (finished + exploded)

### Phase 7 — Expanded Shape Library ✅
- Cones and truncated cones
- Polygonal prisms
- Tubes and sleeves
- Drawer and telescoping boxes
- Custom parametric shapes

### Future Vision
- [ ] Material thickness compensation
- [ ] Laser cutter (DXF) export
- [x] SVG export
- [ ] Custom paper sizes
- [ ] User-created template library
- [ ] Plugin architecture for custom shapes
- [ ] Cloud project synchronisation
- [ ] Community template marketplace
