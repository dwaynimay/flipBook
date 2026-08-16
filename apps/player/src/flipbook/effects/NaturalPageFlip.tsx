import React, { useRef, useState, useCallback, useMemo } from 'react';
import { FoldMathEngine } from '../FoldMathEngine';
import { usePageFlipEngine } from '../usePageFlipEngine';
import type { PageDimensions, Point2D } from '../types';

interface NaturalPageFlipProps {
  width: number;
  height: number;
  frontPage: React.ReactNode;
  backPage: React.ReactNode;
  nextPage: React.ReactNode;
  onFlipped?: () => void;
}

export const NaturalPageFlip: React.FC<NaturalPageFlipProps> = ({
  width,
  height,
  frontPage,
  backPage,
  nextPage,
  onFlipped,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCorner, setActiveCorner] = useState<'top-right' | 'bottom-right' | 'right' | null>(null);

  const bounds: PageDimensions = useMemo(() => ({ width, height }), [width, height]);

  const handleFlipComplete = useCallback(() => {
    setActiveCorner(null);
    if (onFlipped) {
      onFlipped();
    }
  }, [onFlipped]);

  const handleRestoreComplete = useCallback(() => {
    setActiveCorner(null);
  }, []);

  const {
    engineStateRef,
    pageContainerRef,
    shadowLayerRef,
    curlLayerRef,
    startDrag,
    updateDrag,
    endDrag,
  } = usePageFlipEngine({
    bounds,
    onFlipComplete: handleFlipComplete,
    onRestoreComplete: handleRestoreComplete,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > width * 0.4) {
      const corner = y < height * 0.3 ? 'top-right' : y > height * 0.7 ? 'bottom-right' : 'right';
      setActiveCorner(corner);
      const originCorner: Point2D = {
        x: width,
        y: corner === 'top-right' ? 0 : corner === 'bottom-right' ? height : height / 2,
      };

      startDrag({ x, y });

      // Immediate calculation for initial frame clip path
      const geo = FoldMathEngine.calculateFold({ x, y }, originCorner, bounds);
      if (pageContainerRef.current) {
        const polyStr = geo.clipPathPolygon.map((p) => `${p.x}px ${p.y}px`).join(', ');
        pageContainerRef.current.style.clipPath = `polygon(${polyStr})`;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateDrag({ x, y });
  };

  const handlePointerUp = () => {
    if (!activeCorner) return;
    endDrag();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: 'relative',
        width,
        height,
        perspective: 2400,
        transformStyle: 'preserve-3d',
        userSelect: 'none',
        cursor: activeCorner ? 'grabbing' : 'grab',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        backgroundColor: '#fff',
      }}
    >
      {/* 1. LAYER BAWAH: Halaman Berikutnya (Next Page yang sedang diintip) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        {nextPage}

        {/* Outer Drop Shadow (Halaman Bawah) */}
        <div
          ref={shadowLayerRef}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.4) 90%, rgba(0,0,0,0.6) 100%)',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.05s ease-out',
          }}
        />

        {/* Spine Center Shadow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 15,
            background: 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      </div>

      {/* 2. LAYER DEPAN: Halaman Depan Terpotong Lipatan (Zero Re-render DOM ClipPath) */}
      <div
        ref={pageContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          backgroundColor: '#fff',
          overflow: 'hidden',
          willChange: 'clip-path',
        }}
      >
        {frontPage}
      </div>

      {/* 3. LAYER LEMBARAN: Bagian Belakang Kertas yang Terangkat & Melengkung */}
      <div
        ref={curlLayerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          zIndex: 3,
          transformOrigin: `${width}px 0px`,
          transform: `translate3d(${width}px, 0px, 0px) rotateY(0deg)`,
          backfaceVisibility: 'visible',
          transformStyle: 'preserve-3d',
          opacity: activeCorner || engineStateRef.current !== 'IDLE' ? 1 : 0,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        {/* Permukaan Belakang Kertas (Verso) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#fafafa',
            overflow: 'hidden',
            transform: 'scaleX(-1)', // Balik konten agar terbaca benar di sisi belakang
          }}
        >
          {backPage}

          {/* Dynamic Cylindrical Shading & Specular Highlight */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to right,
                rgba(0,0,0,0.25) 0%,
                rgba(255,255,255,0.6) 15%,
                rgba(0,0,0,0.15) 40%,
                transparent 100%)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
