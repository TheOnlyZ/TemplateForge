# TemplateForge

Browser-based parametric template designer that generates true-scale, print-ready PDF templates for boxes, cylinders, cones, prisms, and other physical objects, with multi-net layout optimisation and interactive 3D assembly guidance.

## Why?

I wanted a charger case but couldn't find accurate, ready-to-print templates online. LLMs hallucinated dimensions. So I built this.

## Features

- True-scale printable templates from finished dimensions
- Rectangular boxes (glue-tab, tuck-carton, open-tray), cylinders, cones, prisms, tubes, sleeves, drawer boxes
- Multi-net layout engine — tries strip, cross, and T-layout unfoldings
- Auto-optimisation for Letter, Legal, A4 paper sizes
- Print-ready vector PDFs with calibration rulers
- Live 2D preview synchronised with 3D assembly (finished, exploded, step-by-step)
- Queue & batch multiple shapes into a single print job
- Imperial / metric input
- Project persistence — save, reopen, duplicate, edit

## Quick start

```bash
npm install
npm run dev          # development server
npm run test:run     # run test suite
npm run build        # production build (tsc + vite)
```

## Architecture

```
src/
├── components/       Button, Card, Input, Select, Badge, Stepper (shadcn/ui + Tailwind)
├── lib/              cn() utility (clsx + tailwind-merge)
├── domain/
│   ├── geometry/     2D primitives, Net/Face/GlueTab/Flap/Fold interfaces
│   ├── paper/        paper definitions, printable-area calc
│   ├── units/        imperial/metric conversion, formatting
│   ├── validation/   input, geometry, layout, net validation
│   ├── templates/    shape-agnostic template model
│   ├── shapes/       generators for box, cylinder, cone, prism, tube, drawer, parametric
│   ├── materials/    material definitions
│   └── layout/       single-page placement
├── store/            Zustand app state
├── features/         workspace (3-col layout), wizard, assembly, preview, export, persistence
├── renderers/        PDF generation (pdf-lib), SVG export
├── styles/           app-shell global layout
└── index.css         Tailwind v4 + design tokens
```

## Status

**168 tests across 35 files** — shape generators, net validation, layout engine, React components, store, persistence, PDF/SVG export.

### UI

- **Tailwind v4 + shadcn/ui** — Button, Card, Input, Select, Badge migrated; incremental migration from CSS modules
- **3-column layout** — queue (left, 16rem) / canvas (center, 1fr) / wizard (right, 22rem); validation bar at bottom; collapses to single column ≤1280px
- **Dark theme** — `#0b1119` background, 150ms transitions, focus rings, reduced border opacity

### Future

- [ ] Material thickness compensation
- [ ] Laser cutter (DXF) export
- [ ] Custom paper sizes
- [ ] User-created template library
- [ ] Plugin architecture
- [ ] Cloud sync
- [ ] Community marketplace

See [CHANGELOG.md](./CHANGELOG.md) for version history.
