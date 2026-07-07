# TemplateForge

TemplateForge is a browser-based application for building accurate, printable physical templatesTemplateForge is a browser-based parametric template designer that generates true-scale, print-ready PDF templates for boxes, cylinders, and other physical objects, complete with intelligent page tiling and interactive assembly guidance..

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

