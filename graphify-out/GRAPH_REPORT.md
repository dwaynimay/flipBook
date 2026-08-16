# Graph Report - .  (2026-08-17)

## Corpus Check
- Corpus is ~25,154 words - fits in a single context window. You may not need a graph.

## Summary
- 315 nodes · 466 edges · 17 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App UI Components
- PDF Engine Core
- FlipStage Rendering
- Player Package Config
- Fold Math & Physics
- Root Package Config
- Worker Package Config
- PDF Engine Package Config
- Flip Controller Hook
- Base TS Config
- Worker Converter Script
- Player TS Config
- Worker TS Config
- PDF Engine TS Config
- Manifest Package Config
- Test Fixtures

## God Nodes (most connected - your core abstractions)
1. `PageManifest` - 12 edges
2. `PdfDoc` - 12 edges
3. `compilerOptions` - 12 edges
4. `PdfiumDoc` - 11 edges
5. `PageDimensions` - 9 edges
6. `BookManifest` - 9 edges
7. `FoldMathEngine` - 8 edges
8. `Point2D` - 8 edges
9. `LinkAnnot` - 8 edges
10. `Props` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `BookManifest`  [EXTRACTED]
  apps/player/src/flipbook/Flipbook.tsx → packages/manifest/src/index.ts
- `Props` --references--> `BookManifest`  [EXTRACTED]
  apps/player/src/flipbook/PageFlipProto.tsx → packages/manifest/src/index.ts
- `Props` --references--> `BookManifest`  [EXTRACTED]
  apps/player/src/flipbook/Sidebar.tsx → packages/manifest/src/index.ts
- `SoftFlipStageProps` --references--> `PageManifest`  [EXTRACTED]
  apps/player/src/flipbook/effects/SoftFlipStage.tsx → packages/manifest/src/index.ts
- `ProcessedPage` --references--> `PageManifest`  [EXTRACTED]
  apps/worker/src/convert.ts → packages/manifest/src/index.ts

## Import Cycles
- None detected.

## Communities (17 total, 0 thin omitted)

### Community 0 - "App UI Components"
Cohesion: 0.09
Nodes (17): LinkAnnot, NormRect, OutlineNode, PdfiumDoc, PdfiumEngine, ADR-0001, extractLinksWithPdfJs(), extractOutlineWithPdfJs() (+9 more)

### Community 1 - "PDF Engine Core"
Cohesion: 0.09
Nodes (23): App(), BookIndexEntry, LoadState, readParams(), FlipStage, StageProps, SoftFlipStage, SoftFlipStageProps (+15 more)

### Community 2 - "FlipStage Rendering"
Cohesion: 0.09
Nodes (14): Chevron(), ControllerBar(), Props, stroke, embedCode(), Props, ShareMenu(), Hit (+6 more)

### Community 3 - "Player Package Config"
Cohesion: 0.07
Nodes (26): dependencies, @flip/manifest, react, react-dom, react-pageflip, devDependencies, @types/react, @types/react-dom (+18 more)

### Community 4 - "Fold Math & Physics"
Cohesion: 0.23
Nodes (17): NaturalPageFlip(), NaturalPageFlipProps, FoldMathEngine, decideFlipDecision(), DEFAULT_SPRING_CONFIG, stepSpring(), testMathEngine(), testSpringPhysics() (+9 more)

### Community 5 - "Root Package Config"
Cohesion: 0.10
Nodes (20): devDependencies, pdf-lib, tsx, @types/node, typescript, engines, node, tsx (+12 more)

### Community 6 - "Worker Package Config"
Cohesion: 0.12
Nodes (16): dependencies, @flip/manifest, @flip/pdf-engine, sharp, devDependencies, tsx, @flip/manifest, sharp (+8 more)

### Community 7 - "PDF Engine Package Config"
Cohesion: 0.12
Nodes (16): @hyzyla/pdfium, dependencies, @flip/manifest, @hyzyla/pdfium, pdfjs-dist, sharp, exports, @flip/manifest (+8 more)

### Community 8 - "Flip Controller Hook"
Cohesion: 0.14
Nodes (5): Flipbook(), Props, FlipController, State, useFlipController()

### Community 9 - "Base TS Config"
Cohesion: 0.12
Nodes (15): DOM, DOM.Iterable, compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+7 more)

### Community 10 - "Worker Converter Script"
Cohesion: 0.22
Nodes (12): Args, CONCURRENCY, main(), mapLimit(), normalizeText(), parseArgs(), QUALITY, rebuildIndex() (+4 more)

### Community 11 - "Player TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, noEmit, types, extends, include, src, ../../tsconfig.base.json (+2 more)

### Community 12 - "Worker TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, noEmit, types, extends, include, ES2022, node (+2 more)

### Community 13 - "PDF Engine TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, noEmit, types, extends, include, ES2022, node (+2 more)

### Community 14 - "Manifest Package Config"
Cohesion: 0.25
Nodes (7): exports, main, name, private, type, types, version

### Community 15 - "Test Fixtures"
Cohesion: 0.29
Nodes (5): HERE, outDir, outPath, PAGE_COUNT, PALETTE

## Knowledge Gaps
- **109 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PageManifest` connect `PDF Engine Core` to `FlipStage Rendering`, `Worker Converter Script`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08780487804878048 - nodes in this community are weakly interconnected._
- **Should `PDF Engine Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `FlipStage Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Player Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Root Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._