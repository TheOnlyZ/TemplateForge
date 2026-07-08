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
├── domain/
│   ├── geometry/        — reusable 2D primitives (points, bounds, paths)
│   ├── paper/           — paper definitions, printable-area calculations
│   ├── units/           — unit conversion, imperial/metric formatting
│   ├── validation/      — input, geometry, and layout validation rules
│   ├── templates/       — shape-agnostic template model
│   ├── shapes/          — parametric shape generators
│   │   ├── box/         — strip, cross, and T-layout net generators
│   │   ├── cylinder/
│   │   ├── cone/
│   │   ├── polygonal-prism/
│   │   ├── tube-sleeve/
│   │   ├── drawer-telescoping/
│   │   └── custom-parametric/
│   ├── materials/       — material definitions and guidance
│   └── layout/          — single-page placement, no tiling
├── store/               — Zustand app state (draft, queue, preferences)
├── features/
│   ├── workspace/       — main workspace page with preview + sidebar
│   ├── wizard/          — step-by-step box/cylinder wizard
│   ├── assembly/        — 3D assembly model and views
│   ├── preview/         — SVG template preview component
│   ├── export/          — download helpers
│   └── project/         — serialisation / persistence
├── renderers/
│   ├── pdf/             — PDF document generation
│   └── svg/             — SVG file export
└── App.css              — design system tokens + component styles
```

## Current Status

The implementation is complete through all seven original roadmap phases plus a comprehensive revision pass:

### Layout Engine Redesign
- Multi-net evaluation: strip → cross → T-layout, first fit wins
- No tiling — oversized templates produce validation errors instead
- PDF renderer cleaner, no registration marks or overlap regions

### Shape Engine
- Cylinder workflow fully integrated (shape-type in draft, wizard selector, preview branching, persistence)
- Cylinder-specific validation bounds (`CYLINDER_MAX_DIAMETER_MM`, `CYLINDER_MIN_DIAMETER_MM`)

### UI / UX Refinement
- Cards collapsed into a compact info bar (draft name, shape, material, paper, printable area, limits, status)
- Wizard steps flow horizontally with flex-wrap (no more grid stacking)
- Larger preview area with balanced flat/3D split
- Modular typography scale (`--text-xs` through `--text-2xl`)
- Standardised border-radii, padding, and gap spacing
- 3D assembly overflow fixed (hidden overflow + aspect-ratio)
- Stale copy replaced with shape-agnostic descriptions

### Test Coverage
- 110 unit tests across 32 test files
- Tests for all shape generators, layout engine, validation, store, persistence, and PDF/SVG export

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
