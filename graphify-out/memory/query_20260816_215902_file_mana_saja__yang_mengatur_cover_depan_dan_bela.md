---
type: "query"
date: "2026-08-16T21:59:02.913545+00:00"
question: "file mana saja  yang mengatur cover depan dan belakang pergantian halaman tersebut?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["usePageFlipEngine.ts", "FoldMathEngine.ts", "springPhysics.ts", "NaturalPageFlip.tsx", "flipbook/types.ts"]
---

# Q: file mana saja  yang mengatur cover depan dan belakang pergantian halaman tersebut?

## Answer

Expanded from original query via vocab: [page, flip, turning, prev, next, fold]. Then traversed using BFS.
The logic is handled by a custom engine split into several files:
1. pps/player/src/flipbook/usePageFlipEngine.ts (Controller via usePageFlipEngine())
2. pps/player/src/flipbook/FoldMathEngine.ts (Math engine for clip polygons via .calculateFold())
3. pps/player/src/flipbook/springPhysics.ts (Physics calculations for animation)
4. pps/player/src/flipbook/effects/NaturalPageFlip.tsx (UI component for rendering)
5. pps/player/src/flipbook/types.ts (Data structures like FoldGeometry, PageDimensions)

## Outcome

- Signal: useful

## Source Nodes

- usePageFlipEngine.ts
- FoldMathEngine.ts
- springPhysics.ts
- NaturalPageFlip.tsx
- flipbook/types.ts