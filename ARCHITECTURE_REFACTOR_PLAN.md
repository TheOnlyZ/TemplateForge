
# TemplateForge Architecture Refactor Plan

## Executive Summary

The current implementation has achieved accurate unit conversion and true-scale PDF generation. The next milestone is to transition from a proof-of-concept into a robust, extensible geometry engine.

This document defines the architectural direction for the next phase of development.

---

# Goals

- Separate geometry generation from rendering.
- Treat printable assemblies—not pages—as the primary output.
- Support multiple valid box nets.
- Build a shape-agnostic geometry pipeline.
- Establish a reusable design system and improve UI clarity.
- Ensure every generated template is physically manufacturable.

---

# Current Issues

## Geometry

- Faces can be incorrectly dimensioned.
- Face labels can become detached from geometry.
- Glue-tab geometry overlaps structural panels.
- Missing structural faces can still render.
- One hard-coded net limits future expansion.

## Layout

- Oversized nets are tiled across pages.
- Faces and fold lines cross page boundaries.
- Printable-area violations are allowed.
- The engine thinks in pages rather than printable assemblies.

## UI

- Visual hierarchy is inconsistent.
- Wizard controls wrap awkwardly.
- Heading sizes are inconsistent.
- Preview areas deserve greater emphasis.
- Metadata consumes too much space.
- Overflow exists in the Assembly View controls.

---

# Target Pipeline

Shape Definition

↓

Net Generation

↓

Validation

↓

Layout Optimization

↓

Printable Assemblies

↓

Rendering

---

# Core Interfaces

Define stable domain interfaces before additional feature work.

## ShapeDefinition

Represents the finished physical object.

Contains:

- dimensions
- units
- material
- style
- metadata

No rendering or layout logic.

## Net

Represents a valid unfolded shape.

Contains:

- faces
- folds
- glue tabs
- adjacency graph

Independent of rendering.

## Face

Contains:

- id
- name
- polygon
- width
- height
- neighbors

## Edge

Represents a structural edge.

## Fold

Represents the relationship between two faces.

Contains:

- face A
- face B
- edge
- fold type

## GlueTab

Contains:

- parent face
- parent edge
- geometry

Glue tabs are auxiliary geometry only.

## PrintableAssembly

Represents one printable cutout.

Contains:

- geometry
- printable envelope
- alignment markers
- join markers
- paper requirements

## LayoutResult

Contains:

- printable assemblies
- orientation
- validation summary

## Renderer

Consumes validated PrintableAssembly objects.

Outputs:

- SVG
- PDF
- Live Preview
- Assembly View

## ValidationResult

Contains:

- errors
- warnings
- recommendations

---

# Net Generation Engine

Replace the hard-coded box layout with a generator capable of producing multiple valid nets.

Support:

- Glue Tab Carton
- Tuck Carton
- Open Tray

Future:

- Sleeve
- Drawer Box
- Reverse Tuck
- Straight Tuck

---

# Layout Engine

Do NOT tile one oversized net.

Instead:

Generate Net

↓

Evaluate printable envelope

↓

Fits?

YES

↓

Render

NO

↓

Try alternate nets

↓

Still too large?

↓

Split into multiple printable assemblies

↓

Render

Optimization priorities:

1. Never split structural faces.
2. Never split fold lines.
3. Every printable assembly fits printable margins.
4. Minimize printable assemblies.
5. Minimize pages.
6. Minimize paper waste.

---

# Validation Rules

Before rendering verify:

- Six structural faces exist.
- Face dimensions are correct.
- Labels match geometry.
- Glue tabs attach only to structural edges.
- No overlapping geometry.
- Connected fold graph.
- Printable assemblies fit selected paper.

Abort rendering if validation fails.

---

# Assembly View

Redesign around comprehension.

Modes:

1. Finished Object (default)
2. Exploded View
3. Assembly Sequence

Synchronize 2D and 3D highlighting.

Show one assembly step at a time.

Glue tabs should be visually distinct from structural panels.

---

# UI / UX Improvements

## Typography

Establish a consistent scale:

- Page Title
- Section Heading
- Card Heading
- Body
- Helper Text

Peer sections (e.g. Shape Pipeline and Shape Wizard) must share heading sizes.

## Wizard

Prevent wrapped labels like "Step 6 of 7".

Keep controls on one line.

## Layout

- Increase preview prominence.
- Reduce oversized metadata cards.
- Convert metadata to chips where appropriate.
- Improve whitespace.
- Eliminate overflow.
- Ensure responsive behavior.

## Assembly View Controls

Buttons must remain inside their container.

No overlapping controls.

---

# Design Principles

- Single Responsibility Principle
- Composition over inheritance
- Immutable geometry where practical
- Pure geometry functions
- Rendering independent of geometry
- Validation independent of rendering

---

# Long-Term Vision

TemplateForge should become a general-purpose parametric printable template platform.

Adding a new shape should ideally require only:

1. A ShapeDefinition.
2. One or more Net generators.
3. Registration with the existing pipeline.

All validation, layout optimization, rendering, PDF generation, SVG export, and Assembly View should work automatically.

---

# Definition of Done

The refactor is complete when:

- Geometry is shape-agnostic.
- Multiple valid nets are supported.
- Printable assemblies replace page tiling.
- No structural face spans pages.
- Rendering consumes validated geometry only.
- UI follows a consistent design system.
- Assembly View clearly communicates the finished object and assembly process.
- The architecture is ready to support future shapes without modifying the pipeline.
