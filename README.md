# TemplateForge

## What is TemplateForge?
TemplateForge is a browser-based parametric template designer that generates true-scale, print-ready PDF templates for boxes, cylinders, and other physical objects, complete with intelligent page tiling and interactive assembly guidance..

## Why does it exist?
One day, I wanted to check if a charger would fit neatly into a small case that I intended to keep cables, port hubs, and the like in.
Rather than painstakingly measure out the template on paper with a ruler and then cut, I thought to give a few LLM's a try to see how well they could create accurate, ready-to-print templates.
Alas, they failed in various ways, and this spurred me to create a simple web application that can achieve that end with a few additional features.

## Key features

- 📐 Generate true-scale printable templates from finished dimensions
- 📦 Support for rectangular boxes (glue-tab, tuck-tab, and tray styles)
- 🛢️ Support for cylindrical templates with glue tabs and alignment tabs
- 📄 Export immutable, vector-based PDFs for accurate printing
- 📏 Built-in print calibration rulers and scale verification
- 🖨️ Automatic layout optimization for Letter and Legal paper
- ✂️ Intelligent multi-page tiling for oversized templates
- 🎯 Printer-safe margin handling to avoid unprintable areas
- 🧩 Assembly-optimized layouts that minimize seams and simplify construction
- 👁️ Live 2D template preview with synchronized interactive 3D Assembly View
- 📚 Queue and batch multiple shapes into a single optimized print job
- 🔄 Support for both Imperial and Metric units
- 🧠 Parametric geometry engine designed for future expansion to additional shapes

## Installation:



This repository is now beyond the foundation phase. The current implementation establishes:

- a strict React + TypeScript + Vite app shell
- unit conversion and print-tolerance rules
- reusable 2D geometry primitives
- a shape-agnostic template model
- validation rules for MVP constraints
- paper definitions and printable-area calculations
- rectangular box generation, preview, and export
- cylinder generation with seam and alignment guidance
- tiled multi-page layout with registration and assembly aids
- project queueing, batch export, nesting, save/reopen, duplication, and editing
- a first interactive assembly slice with 3D box visualization, face highlighting, animated sequencing, and fold guidance

## Commands

```bash
npm install
npm run dev
npm run test:run
npm run build
```

## Current Focus

The current implementation now covers all seven planned roadmap phases and a comprehension-first box assembly workflow: unit-correct input, finished-object-first assembly modes, bidirectional 2D/3D highlighting, guided fold sequencing, and less intrusive guardrails. The Future Vision items remain intentionally deferred for a later pass.

## Roadmap

### Phase 1 — Foundation ✅
- [x] React + TypeScript + Vite project setup
- [x] Shape-agnostic geometry architecture
- [x] Unit conversion and print-tolerance rules
- [x] Paper definitions and printable-area calculations
- [x] Validation framework for template constraints

### Phase 2 — First Shape Support ✅
- [x] Parametric rectangular box generator
- [x] Glue-tab, tuck-carton, and tray box styles
- [x] Live SVG template preview
- [x] True-scale vector PDF export
- [x] Print calibration rulers and scale verification

### Phase 3 — Advanced Template Generation ✅
- [x] Cylinder template generator
- [x] Automatic glue tabs and alignment tabs
- [x] Intelligent layout optimization
- [x] Letter and Legal paper support
- [x] Automatic page orientation selection

### Phase 4 — Multi-Page Intelligence ✅
- [x] Intelligent template tiling
- [x] Registration marks and alignment guides
- [x] Multi-page assembly labels
- [x] Join indicators and overlap regions
- [x] Printer-safe margin validation

### Phase 5 — Project Workspace ✅
- [x] Queue multiple shapes into a single project
- [x] Batch PDF generation
- [x] Optimized page nesting to reduce paper usage
- [x] Save and reopen projects
- [x] Shape duplication and editing

### Phase 6 — Interactive Assembly ✅
- [x] 3D Assembly View
- [x] Face-to-template highlighting
- [x] Animated assembly sequence
- [x] Interactive folding guidance
- [x] Part identification and page mapping

### Phase 7 — Expanded Shape Library ✅
- [x] Cones and truncated cones
- [x] Polygonal prisms
- [x] Tubes and sleeves
- [x] Drawer and telescoping boxes
- [x] Custom parametric shapes

### Future Vision
- [ ] Material thickness compensation
- [ ] Laser cutter (DXF) export
- [x] SVG export
- [ ] Custom paper sizes
- [ ] User-created template library
- [ ] Plugin architecture for custom shapes
- [ ] Cloud project synchronization
- [ ] Community template marketplace
