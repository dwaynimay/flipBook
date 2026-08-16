// Types Definition: Flipbook Domain Core & Math Engine

export type CornerPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

export type EngineState =
  | 'IDLE'
  | 'CORNER_HOVER'
  | 'DRAGGING'
  | 'ANIMATING_FLIP'
  | 'ANIMATING_RESTORE';

export interface Point2D {
  x: number;
  y: number;
}

export interface FoldGeometry {
  corner: Point2D;
  dragPoint: Point2D;
  midPoint: Point2D;
  foldAngle: number;
  clipPathPolygon: Point2D[];
  shadowOpacity: number;
  curlDepth: number;
}

export interface PageDimensions {
  width: number;
  height: number;
}

export interface SpringConfig {
  stiffness: number; // k (N/m)
  damping: number;   // c (Ns/m)
  mass: number;      // m (kg)
}

export interface PhysicsState {
  position: number;
  velocity: number;
}
