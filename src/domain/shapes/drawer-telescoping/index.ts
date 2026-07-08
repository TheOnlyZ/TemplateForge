import { getBounds, type Point } from '../../geometry/index.ts'
import type {
  Annotation,
  CutPath,
  FoldLine,
  JoinEdge,
  Panel,
  Tab,
  TemplateItem,
  TemplatePart,
} from '../../templates/index.ts'
import {
  createEntityId,
  getOutlineBounds,
  getRectangleCenter,
  type ShapeGenerationContext,
  type ShapeGenerationResult,
} from '../shared/index.ts'
import { generateBoxTemplate } from '../box/index.ts'

export interface DrawerBoxInput {
  externalLengthMm: number
  externalWidthMm: number
  externalHeightMm: number
  glueTabWidthMm: number
  sleeveClearanceMm?: number
}

export interface TelescopingBoxInput {
  baseLengthMm: number
  baseWidthMm: number
  baseHeightMm: number
  lidHeightMm?: number
  glueTabWidthMm: number
  lidClearanceMm?: number
}

interface SleeveGenerationResult {
  part: TemplatePart
  panels: Panel[]
  cutPaths: CutPath[]
  foldLines: FoldLine[]
  tabs: Tab[]
  joinEdges: JoinEdge[]
  annotations: Annotation[]
}

const DEFAULT_SLEEVE_CLEARANCE_MM = 1.5
const DEFAULT_LID_CLEARANCE_MM = 1.5

function roundMm(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function createPanelAnnotation(
  context: ShapeGenerationContext,
  panel: Panel,
  text: string,
): Annotation {
  return {
    id: createEntityId(context, 'annotation', panel.id),
    kind: 'label',
    text,
    position: getRectangleCenter(panel.outline),
    targetIds: [panel.id],
  }
}

function createRegistrationAnnotation(
  context: ShapeGenerationContext,
  id: string,
  text: string,
  position: Point,
  targetId: string,
): Annotation {
  return {
    id: createEntityId(context, 'annotation', id),
    kind: 'registration',
    text,
    position,
    targetIds: [targetId],
  }
}

function createVerticalGlueTab(x: number, yTop: number, yBottom: number, glueTabWidthMm: number): Point[] {
  const wallHeight = yBottom - yTop
  const inset = Math.min(glueTabWidthMm * 0.45, Math.max(4, wallHeight * 0.2))

  return [
    { x, y: roundMm(yTop) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yTop + inset) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yBottom - inset) },
    { x, y: roundMm(yBottom) },
  ]
}

function createTab(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  label: string,
  outline: Point[],
): Tab {
  const bounds = getBounds(outline)

  return {
    id: createEntityId(context, 'tab', id),
    partId,
    outline,
    attachStart: outline[0]!,
    attachEnd: outline.at(-1)!,
    widthMm: Math.min(bounds.width, bounds.height),
    label,
  }
}

function createCutPath(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  path: Point[],
  closed: boolean,
): CutPath {
  return {
    id: createEntityId(context, 'cut', id),
    partId,
    path,
    style: 'solid',
    closed,
  }
}

function createFoldLine(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  start: Point,
  end: Point,
): FoldLine {
  return {
    id: createEntityId(context, 'fold', id),
    partId,
    start,
    end,
    foldType: 'score',
    style: 'dashed',
  }
}

function renameSinglePartTemplate(template: TemplateItem, partName: string) {
  return {
    ...template,
    parts: [{
      ...template.parts[0]!,
      name: partName,
    }],
  }
}

function mergeTemplates(
  context: ShapeGenerationContext,
  name: string,
  shapeType: string,
  dimensionsMm: Record<string, number>,
  pieces: TemplateItem[],
  assemblyNotes: { id: string; text: string; step?: number }[],
  metadata: Record<string, string | number | boolean>,
): ShapeGenerationResult {
  return {
    template: {
      id: context.itemId,
      version: 1,
      name,
      shapeType,
      dimensionsMm,
      parts: pieces.flatMap((piece) => piece.parts),
      panels: pieces.flatMap((piece) => piece.panels),
      cutPaths: pieces.flatMap((piece) => piece.cutPaths),
      foldLines: pieces.flatMap((piece) => piece.foldLines),
      tabs: pieces.flatMap((piece) => piece.tabs),
      joinEdges: pieces.flatMap((piece) => piece.joinEdges),
      annotations: pieces.flatMap((piece) => piece.annotations),
      splitCandidates: pieces.flatMap((piece) => piece.splitCandidates),
      assemblyNotes,
      pages: [],
      metadata,
    },
  }
}

function generateRectangularSleeve(
  input: { lengthMm: number; widthMm: number; heightMm: number; glueTabWidthMm: number },
  context: ShapeGenerationContext,
): SleeveGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const panelWidths = [input.widthMm, input.heightMm, input.widthMm, input.heightMm]
  const panelNames = ['Top Sleeve', 'Right Sleeve', 'Bottom Sleeve', 'Left Sleeve']
  let cursorX = 0
  const panels: Panel[] = panelWidths.map((width, index) => {
    const outline = [
      { x: roundMm(cursorX), y: 0 },
      { x: roundMm(cursorX + width), y: 0 },
      { x: roundMm(cursorX + width), y: roundMm(input.lengthMm) },
      { x: roundMm(cursorX), y: roundMm(input.lengthMm) },
    ]
    const panel: Panel = {
      id: createEntityId(context, 'panel', `sleeve-${index + 1}`),
      partId,
      name: panelNames[index]!,
      outline,
      bounds: getBounds(outline),
    }

    cursorX += width
    return panel
  })
  const totalWidth = panelWidths.reduce((total, width) => total + width, 0)
  const glueSeamTab = createTab(
    context,
    partId,
    'glue-seam',
    'Glue Seam',
    createVerticalGlueTab(totalWidth, 0, input.lengthMm, input.glueTabWidthMm),
  )
  const cutPaths: CutPath[] = [
    createCutPath(context, partId, 'left-edge', [{ x: 0, y: 0 }, { x: 0, y: input.lengthMm }], false),
    createCutPath(context, partId, 'top-edge', [{ x: 0, y: 0 }, { x: totalWidth, y: 0 }], false),
    createCutPath(
      context,
      partId,
      'bottom-edge',
      [
        { x: 0, y: input.lengthMm },
        { x: totalWidth, y: input.lengthMm },
      ],
      false,
    ),
    createCutPath(context, partId, 'glue-seam', glueSeamTab.outline, false),
  ]
  const foldLines: FoldLine[] = [
    ...panels.slice(0, -1).map((panel, index) =>
      createFoldLine(
        context,
        partId,
        `sleeve-face-${index + 1}`,
        { x: roundMm(panel.bounds.maxX), y: 0 },
        { x: roundMm(panel.bounds.maxX), y: roundMm(input.lengthMm) },
      ),
    ),
    createFoldLine(
      context,
      partId,
      'glue-seam',
      { x: roundMm(totalWidth), y: 0 },
      { x: roundMm(totalWidth), y: roundMm(input.lengthMm) },
    ),
  ]
  const joinEdges: JoinEdge[] = [
    {
      id: createEntityId(context, 'join-edge', 'sleeve-a-start'),
      partId,
      start: { x: 0, y: 0 },
      end: { x: 0, y: roundMm(input.lengthMm) },
      label: 'Sleeve A',
      partnerId: createEntityId(context, 'join-edge', 'sleeve-a-end'),
    },
    {
      id: createEntityId(context, 'join-edge', 'sleeve-a-end'),
      partId,
      start: { x: roundMm(totalWidth), y: 0 },
      end: { x: roundMm(totalWidth), y: roundMm(input.lengthMm) },
      label: 'Sleeve A',
      partnerId: createEntityId(context, 'join-edge', 'sleeve-a-start'),
    },
  ]
  const annotations: Annotation[] = [
    ...panels.map((panel) => createPanelAnnotation(context, panel, panel.name)),
    createRegistrationAnnotation(
      context,
      'sleeve-start',
      'Sleeve A',
      { x: 8, y: roundMm(input.lengthMm / 2) },
      joinEdges[0]!.id,
    ),
    createRegistrationAnnotation(
      context,
      'sleeve-end',
      'Sleeve A',
      { x: roundMm(totalWidth - 8), y: roundMm(input.lengthMm / 2) },
      joinEdges[1]!.id,
    ),
  ]
  const partBounds = getOutlineBounds([...panels.map((panel) => panel.outline), glueSeamTab.outline])
  const part: TemplatePart = {
    id: partId,
    name: 'Sleeve Shell',
    panelIds: panels.map((panel) => panel.id),
    cutPathIds: cutPaths.map((path) => path.id),
    foldLineIds: foldLines.map((line) => line.id),
    tabIds: [glueSeamTab.id],
    joinEdgeIds: joinEdges.map((edge) => edge.id),
    bounds: partBounds,
  }

  return {
    part,
    panels,
    cutPaths,
    foldLines,
    tabs: [glueSeamTab],
    joinEdges,
    annotations,
  }
}

function createTemplateFromSleeve(
  context: ShapeGenerationContext,
  result: SleeveGenerationResult,
  metadata: Record<string, string | number | boolean>,
  dimensionsMm: Record<string, number>,
  shapeType: string,
  name: string,
  assemblyNote: string,
): TemplateItem {
  return {
    id: context.itemId,
    version: 1,
    name,
    shapeType,
    dimensionsMm,
    parts: [result.part],
    panels: result.panels,
    cutPaths: result.cutPaths,
    foldLines: result.foldLines,
    tabs: result.tabs,
    joinEdges: result.joinEdges,
    annotations: result.annotations,
    splitCandidates: result.foldLines.map((line, index) => ({
      id: createEntityId(context, 'split', `fold-${index + 1}`),
      partId: result.part.id,
      start: line.start,
      end: line.end,
      kind: 'fold' as const,
      priority: index + 1,
      reason: line.id.includes('glue-seam') ? 'Primary sleeve seam fold' : 'Primary sleeve side fold',
    })),
    assemblyNotes: [
      {
        id: createEntityId(context, 'note', 'assembly'),
        text: assemblyNote,
        step: 1,
      },
    ],
    pages: [],
    metadata,
  }
}

export function generateDrawerBoxTemplate(
  input: DrawerBoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const sleeveClearanceMm = roundMm(input.sleeveClearanceMm ?? DEFAULT_SLEEVE_CLEARANCE_MM)
  const drawerTemplate = renameSinglePartTemplate(
    generateBoxTemplate(
      {
        externalLengthMm: input.externalLengthMm,
        externalWidthMm: input.externalWidthMm,
        externalHeightMm: input.externalHeightMm,
        glueTabWidthMm: input.glueTabWidthMm,
        style: 'open-tray',
      },
      {
        itemId: `${context.itemId}:drawer`,
        itemName: `${context.itemName} Drawer`,
      },
    ).template,
    'Inner Drawer',
  )
  const sleeveTemplate = createTemplateFromSleeve(
    {
      itemId: `${context.itemId}:sleeve`,
      itemName: `${context.itemName} Sleeve`,
    },
    generateRectangularSleeve(
      {
        lengthMm: input.externalLengthMm + sleeveClearanceMm,
        widthMm: input.externalWidthMm + sleeveClearanceMm * 2,
        heightMm: input.externalHeightMm + sleeveClearanceMm * 2,
        glueTabWidthMm: input.glueTabWidthMm,
      },
      {
        itemId: `${context.itemId}:sleeve`,
        itemName: `${context.itemName} Sleeve`,
      },
    ),
    {
      profile: 'drawer-box-sleeve',
      sleeveClearance: sleeveClearanceMm,
      queueStatus: 'draft',
    },
    {
      length: input.externalLengthMm,
      width: input.externalWidthMm,
      height: input.externalHeightMm,
      sleeveClearance: sleeveClearanceMm,
    },
    'drawer-box',
    `${context.itemName} Sleeve`,
    'Wrap the outer sleeve into shape and secure the Glue Seam before sliding the inner drawer tray into place.',
  )

  return mergeTemplates(
    context,
    context.itemName,
    'drawer-box',
    {
      length: input.externalLengthMm,
      width: input.externalWidthMm,
      height: input.externalHeightMm,
      sleeveClearance: sleeveClearanceMm,
    },
    [drawerTemplate, sleeveTemplate],
    [
      {
        id: createEntityId(context, 'note', 'drawer-tray'),
        text: 'Assemble the inner drawer tray first by raising the tray walls and securing the corner tabs.',
        step: 1,
      },
      {
        id: createEntityId(context, 'note', 'outer-sleeve'),
        text: 'Form the outer sleeve, secure the Glue Seam, then slide the inner drawer into the sleeve body.',
        step: 2,
      },
    ],
    {
      profile: 'drawer-box',
      sleeveClearance: sleeveClearanceMm,
      queueStatus: 'draft',
    },
  )
}

export function generateTelescopingBoxTemplate(
  input: TelescopingBoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const lidClearanceMm = roundMm(input.lidClearanceMm ?? DEFAULT_LID_CLEARANCE_MM)
  const lidHeightMm = roundMm(input.lidHeightMm ?? Math.max(input.baseHeightMm * 0.65, 16))
  const baseTemplate = renameSinglePartTemplate(
    generateBoxTemplate(
      {
        externalLengthMm: input.baseLengthMm,
        externalWidthMm: input.baseWidthMm,
        externalHeightMm: input.baseHeightMm,
        glueTabWidthMm: input.glueTabWidthMm,
        style: 'open-tray',
      },
      {
        itemId: `${context.itemId}:base`,
        itemName: `${context.itemName} Base`,
      },
    ).template,
    'Base Tray',
  )
  const lidTemplate = renameSinglePartTemplate(
    generateBoxTemplate(
      {
        externalLengthMm: input.baseLengthMm + lidClearanceMm * 2,
        externalWidthMm: input.baseWidthMm + lidClearanceMm * 2,
        externalHeightMm: lidHeightMm,
        glueTabWidthMm: input.glueTabWidthMm,
        style: 'open-tray',
      },
      {
        itemId: `${context.itemId}:lid`,
        itemName: `${context.itemName} Lid`,
      },
    ).template,
    'Top Lid',
  )

  return mergeTemplates(
    context,
    context.itemName,
    'telescoping-box',
    {
      baseLength: input.baseLengthMm,
      baseWidth: input.baseWidthMm,
      baseHeight: input.baseHeightMm,
      lidHeight: lidHeightMm,
      lidClearance: lidClearanceMm,
    },
    [baseTemplate, lidTemplate],
    [
      {
        id: createEntityId(context, 'note', 'base-tray'),
        text: 'Assemble the base tray first by raising the walls and securing the corner tabs.',
        step: 1,
      },
      {
        id: createEntityId(context, 'note', 'top-lid'),
        text: 'Assemble the lid tray separately, then slide it over the base tray to create the telescoping closure.',
        step: 2,
      },
    ],
    {
      profile: 'telescoping-box',
      lidHeight: lidHeightMm,
      lidClearance: lidClearanceMm,
      queueStatus: 'draft',
    },
  )
}
