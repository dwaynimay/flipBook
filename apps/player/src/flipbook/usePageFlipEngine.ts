import { useRef, useEffect, useCallback } from 'react';
import type { PageDimensions, SpringConfig, EngineState, Point2D } from './types';
import { FoldMathEngine } from './FoldMathEngine';
import { stepSpring, DEFAULT_SPRING_CONFIG, decideFlipDecision } from './springPhysics';

export interface UsePageFlipEngineOptions {
  bounds: PageDimensions;
  springConfig?: SpringConfig;
  onFlipComplete?: () => void;
  onRestoreComplete?: () => void;
}

export function usePageFlipEngine({
  bounds,
  springConfig = DEFAULT_SPRING_CONFIG,
  onFlipComplete,
  onRestoreComplete,
}: UsePageFlipEngineOptions) {
  const engineStateRef = useRef<EngineState>('IDLE');
  const pointerPosRef = useRef<Point2D>({ x: bounds.width, y: 0 });
  const velocityRef = useRef<Point2D>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(performance.now());
  const lastPointerPosRef = useRef<Point2D>({ x: bounds.width, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Direct DOM Element Refs (Zero React Re-renders)
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const shadowLayerRef = useRef<HTMLDivElement | null>(null);
  const curlLayerRef = useRef<HTMLDivElement | null>(null);

  const renderFrame = useCallback(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.032);
    lastTimeRef.current = now;

    if (engineStateRef.current === 'DRAGGING') {
      const geo = FoldMathEngine.calculateFold(
        pointerPosRef.current,
        { x: bounds.width, y: 0 },
        bounds
      );

      if (pageContainerRef.current) {
        const polyStr = geo.clipPathPolygon.map((p) => `${p.x}px ${p.y}px`).join(', ');
        pageContainerRef.current.style.clipPath = `polygon(${polyStr})`;
      }

      if (shadowLayerRef.current) {
        shadowLayerRef.current.style.opacity = `${geo.shadowOpacity}`;
      }

      if (curlLayerRef.current) {
        const progress = Math.min(Math.max(1 - pointerPosRef.current.x / bounds.width, 0), 1);
        const rotY = -180 * progress;
        curlLayerRef.current.style.transform = `translate3d(${pointerPosRef.current.x - bounds.width}px, ${pointerPosRef.current.y}px, 0) rotateY(${rotY}deg)`;
      }
    } else if (
      engineStateRef.current === 'ANIMATING_FLIP' ||
      engineStateRef.current === 'ANIMATING_RESTORE'
    ) {
      const targetX = engineStateRef.current === 'ANIMATING_FLIP' ? -bounds.width * 0.5 : bounds.width;

      const nextX = stepSpring(
        { position: pointerPosRef.current.x, velocity: velocityRef.current.x },
        targetX,
        springConfig,
        dt
      );

      pointerPosRef.current.x = nextX.position;
      velocityRef.current.x = nextX.velocity;

      const geo = FoldMathEngine.calculateFold(
        pointerPosRef.current,
        { x: bounds.width, y: 0 },
        bounds
      );

      if (pageContainerRef.current) {
        const polyStr = geo.clipPathPolygon.map((p) => `${p.x}px ${p.y}px`).join(', ');
        pageContainerRef.current.style.clipPath = `polygon(${polyStr})`;
      }

      if (shadowLayerRef.current) {
        shadowLayerRef.current.style.opacity = `${geo.shadowOpacity}`;
      }

      if (curlLayerRef.current) {
        const progress = Math.min(Math.max(1 - pointerPosRef.current.x / bounds.width, 0), 1);
        const rotY = -180 * progress;
        curlLayerRef.current.style.transform = `translate3d(${pointerPosRef.current.x - bounds.width}px, ${pointerPosRef.current.y}px, 0) rotateY(${rotY}deg)`;
      }

      // Cek konvergensi posisi dan velocity fisika pegas
      if (Math.abs(nextX.position - targetX) < 0.5 && Math.abs(nextX.velocity) < 1.0) {
        const finishedState = engineStateRef.current;
        engineStateRef.current = 'IDLE';

        if (finishedState === 'ANIMATING_FLIP' && onFlipComplete) {
          onFlipComplete();
        } else if (finishedState === 'ANIMATING_RESTORE' && onRestoreComplete) {
          onRestoreComplete();
        }
      }
    }

    if (engineStateRef.current !== 'IDLE') {
      rafIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [bounds, springConfig, onFlipComplete, onRestoreComplete]);

  const startDrag = useCallback(
    (startPos: Point2D) => {
      engineStateRef.current = 'DRAGGING';
      pointerPosRef.current = startPos;
      lastPointerPosRef.current = startPos;
      velocityRef.current = { x: 0, y: 0 };
      lastTimeRef.current = performance.now();

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(renderFrame);
    },
    [renderFrame]
  );

  const updateDrag = useCallback(
    (currentPos: Point2D) => {
      if (engineStateRef.current !== 'DRAGGING') return;

      const now = performance.now();
      const dt = Math.max((now - lastTimeRef.current) / 1000, 0.001);

      // Hitung velocity kursor (px/sec)
      velocityRef.current = {
        x: (currentPos.x - lastPointerPosRef.current.x) / dt,
        y: (currentPos.y - lastPointerPosRef.current.y) / dt,
      };

      lastPointerPosRef.current = currentPos;
      pointerPosRef.current = currentPos;
    },
    []
  );

  const endDrag = useCallback(() => {
    if (engineStateRef.current !== 'DRAGGING') return;

    const isFlip = decideFlipDecision(
      pointerPosRef.current.x,
      velocityRef.current.x,
      bounds.width
    );

    engineStateRef.current = isFlip ? 'ANIMATING_FLIP' : 'ANIMATING_RESTORE';

    if (rafIdRef.current === null) {
      lastTimeRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [bounds.width, renderFrame]);

  // Clean-up loop RAF pada unmount untuk mencegah memory leak
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return {
    engineStateRef,
    pageContainerRef,
    shadowLayerRef,
    curlLayerRef,
    startDrag,
    updateDrag,
    endDrag,
  };
}
