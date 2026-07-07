# TemplateForge

## What is TemplateForge?
TemplateForge is a browser-based application for building accurate, printable physical templatesTemplateForge is a browser-based parametric template designer that generates true-scale, print-ready PDF templates for boxes, cylinders, and other physical objects, complete with intelligent page tiling and interactive assembly guidance..

## Why does it exist?
One day, I really wanted to check if a charger would fit neatly into a small case that I intended to keep cables, port hubs, and the like in.
Rather than measure out the template painstakingly on paper with a ruler and then cut, I decidded to give a few LLM's a try to see how well they could create accurate, ready-to-print templates.
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



This repository is currently in the foundation phase. The first implemented package establishes:

- a strict React + TypeScript + Vite app shell
- unit conversion and print-tolerance rules
- reusable 2D geometry primitives
- a shape-agnostic template model
- validation rules for MVP constraints
- paper definitions and printable-area calculations

## Commands

```bash
npm install
npm run dev
npm run test:run
npm run build
```

## Current Focus

The current implementation intentionally prioritizes domain correctness over feature breadth. The next major build slice is the first real shape vertical: rectangular boxes, live SVG preview, and true-scale vector export.

## Roadmap

### Phase 1 — Foundation ✅ *(In Progress)*
- [x] React + TypeScript + Vite project setup
- [x] Shape-agnostic geometry architecture
- [x] Unit conversion and print-tolerance rules
- [x] Paper definitions and printable-area calculations
- [x] Validation framework for template constraints

### Phase 2 — First Shape Support
- [ ] Parametric rectangular box generator
- [ ] Glue-tab, tuck-carton, and tray box styles
- [ ] Live SVG template preview
- [ ] True-scale vector PDF export
- [ ] Print calibration rulers and scale verification

### Phase 3 — Advanced Template Generation
- [ ] Cylinder template generator
- [ ] Automatic glue tabs and alignment tabs
- [ ] Intelligent layout optimization
- [ ] Letter and Legal paper support
- [ ] Automatic page orientation selection

### Phase 4 — Multi-Page Intelligence
- [ ] Intelligent template tiling
- [ ] Registration marks and alignment guides
- [ ] Multi-page assembly labels
- [ ] Join indicators and overlap regions
- [ ] Printer-safe margin validation

### Phase 5 — Project Workspace
- [ ] Queue multiple shapes into a single project
- [ ] Batch PDF generation
- [ ] Optimized page nesting to reduce paper usage
- [ ] Save and reopen projects
- [ ] Shape duplication and editing

### Phase 6 — Interactive Assembly
- [ ] 3D Assembly View
- [ ] Face-to-template highlighting
- [ ] Animated assembly sequence
- [ ] Interactive folding guidance
- [ ] Part identification and page mapping

### Phase 7 — Expanded Shape Library
- [ ] Cones and truncated cones
- [ ] Polygonal prisms
- [ ] Tubes and sleeves
- [ ] Drawer and telescoping boxes
- [ ] Custom parametric shapes

### Future Vision
- [ ] Material thickness compensation
- [ ] Laser cutter (DXF) export
- [ ] SVG export
- [ ] Custom paper sizes
- [ ] User-created template library
- [ ] Plugin architecture for custom shapes
- [ ] Cloud project synchronization
- [ ] Community template marketplace
