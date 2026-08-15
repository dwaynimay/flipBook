import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Kontroler efek flip.
 *
 * Model lembaran (sheet), bukan halaman. Satu lembar punya dua sisi:
 *   sheet k  →  depan = halaman 2k,  belakang = halaman 2k+1
 *
 * Pada posisi spread s:
 *   halaman kiri  = 2s - 1   (belakang lembar s-1)
 *   halaman kanan = 2s       (depan lembar s)
 *
 * Sehingga s=0 menghasilkan sampul sendirian di kanan — persis perilaku
 * flipbook cetak. Lembar dengan k < s sudah terbalik ke kiri.
 *
 * Kualitas efek ini bergantung pada satu hal di atas segalanya: halaman harus
 * MENGIKUTI JARI secara real-time saat di-drag, bukan sekadar memicu animasi
 * saat dilepas. Itu pembeda antara terasa nyata dan terasa palsu.
 * Lihat docs/02-ARCHITECTURE.md §5.2.
 */

export interface Turning {
  sheet: number;
  dir: 'next' | 'prev';
  progress: number;
}

interface State {
  spread: number;
  turning: Turning | null;
}

const DRAG_THRESHOLD_PX = 6;
const COMMIT_THRESHOLD = 0.38;

/**
 * setPointerCapture/releasePointerCapture melempar bila pointer sudah tidak
 * aktif — misalnya saat gesture dibatalkan sistem, atau saat event disintesis.
 * Kegagalan menangkap pointer bukan alasan untuk mematikan interaksi.
 */
function capturePointer(el: Element, pointerId: number, capture: boolean): void {
  try {
    if (capture) (el as HTMLElement).setPointerCapture?.(pointerId);
    else (el as HTMLElement).releasePointerCapture?.(pointerId);
  } catch {
    /* abaikan — drag tetap berfungsi lewat event bubbling biasa */
  }
}

/** Terasa punya massa: cepat di awal, mengendap di akhir. */
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export interface FlipController {
  spread: number;
  turning: Turning | null;
  sheetCount: number;
  canPrev: boolean;
  canNext: boolean;
  isAnimating: boolean;
  next(): void;
  prev(): void;
  goToSpread(target: number): void;
  goToPage(pageIndex: number): void;
  /** Sudut rotasi lembar k dalam derajat (0 = belum dibalik, -180 = sudah). */
  angleOf(sheet: number): number;
  bindDrag(halfWidthPx: number): {
    onPointerDown(e: React.PointerEvent): void;
    onPointerMove(e: React.PointerEvent): void;
    onPointerUp(e: React.PointerEvent): void;
    onPointerCancel(e: React.PointerEvent): void;
  };
}

export function useFlipController(
  sheetCount: number,
  initialSpread = 0,
  onSpreadChange?: (spread: number) => void,
): FlipController {
  const [state, setState] = useState<State>({ spread: initialSpread, turning: null });
  const stateRef = useRef(state);
  stateRef.current = state;

  const rafRef = useRef<number | null>(null);
  const animatingRef = useRef(false);
  const drag = useRef({ active: false, startX: 0, moved: false, halfWidth: 1 });

  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const commit = useCallback(
    (turning: Turning) => {
      const next =
        turning.dir === 'next' ? stateRef.current.spread + 1 : stateRef.current.spread - 1;
      setState({ spread: next, turning: null });
      onSpreadChange?.(next);
    },
    [onSpreadChange],
  );

  /** Tween progress lembar yang sedang berputar menuju 0 (batal) atau 1 (jadi). */
  const animateTo = useCallback(
    (target: 0 | 1) => {
      const turning = stateRef.current.turning;
      if (!turning) return;

      if (reduceMotion.current) {
        if (target === 1) commit(turning);
        else setState((s) => ({ ...s, turning: null }));
        return;
      }

      const from = turning.progress;
      const distance = Math.abs(target - from);
      if (distance < 0.001) {
        if (target === 1) commit(turning);
        else setState((s) => ({ ...s, turning: null }));
        return;
      }

      const duration = Math.min(520, Math.max(180, distance * 620));
      const ease = target === 1 ? easeOutQuart : easeOutCubic;
      const startedAt = performance.now();
      animatingRef.current = true;

      const step = (now: number): void => {
        const t = Math.min(1, (now - startedAt) / duration);
        const progress = from + (target - from) * ease(t);

        if (t < 1) {
          setState((s) => (s.turning ? { ...s, turning: { ...s.turning, progress } } : s));
          rafRef.current = requestAnimationFrame(step);
          return;
        }

        animatingRef.current = false;
        rafRef.current = null;
        const current = stateRef.current.turning;
        if (!current) return;
        if (target === 1) commit(current);
        else setState((s) => ({ ...s, turning: null }));
      };

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(step);
    },
    [commit],
  );

  const startTurn = useCallback((dir: 'next' | 'prev', progress = 0): boolean => {
    const { spread, turning } = stateRef.current;
    if (turning) return false;
    if (dir === 'next' && spread >= sheetCount) return false;
    if (dir === 'prev' && spread <= 0) return false;

    const sheet = dir === 'next' ? spread : spread - 1;
    setState((s) => ({ ...s, turning: { sheet, dir, progress } }));
    return true;
  }, [sheetCount]);

  const next = useCallback(() => {
    if (animatingRef.current) return;
    if (startTurn('next')) requestAnimationFrame(() => animateTo(1));
  }, [startTurn, animateTo]);

  const prev = useCallback(() => {
    if (animatingRef.current) return;
    if (startTurn('prev')) requestAnimationFrame(() => animateTo(1));
  }, [startTurn, animateTo]);

  const goToSpread = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(sheetCount, target));
      if (clamped === stateRef.current.spread) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      animatingRef.current = false;
      setState({ spread: clamped, turning: null });
      onSpreadChange?.(clamped);
    },
    [sheetCount, onSpreadChange],
  );

  const goToPage = useCallback(
    (pageIndex: number) => goToSpread(Math.ceil(pageIndex / 2)),
    [goToSpread],
  );

  const angleOf = useCallback(
    (sheet: number): number => {
      const { spread, turning } = state;
      if (turning && turning.sheet === sheet) {
        return turning.dir === 'next' ? -180 * turning.progress : -180 * (1 - turning.progress);
      }
      return sheet < spread ? -180 : 0;
    },
    [state],
  );

  const bindDrag = useCallback(
    (halfWidthPx: number) => {
      drag.current.halfWidth = Math.max(1, halfWidthPx);

      return {
        onPointerDown(e: React.PointerEvent) {
          if (animatingRef.current) return;
          drag.current.active = true;
          drag.current.startX = e.clientX;
          drag.current.moved = false;
          capturePointer(e.currentTarget as Element, e.pointerId, true);
        },

        onPointerMove(e: React.PointerEvent) {
          if (!drag.current.active) return;
          const dx = e.clientX - drag.current.startX;

          if (!drag.current.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
            drag.current.moved = true;
            // Arah ditentukan sekali, saat ambang batas terlampaui.
            if (!startTurn(dx < 0 ? 'next' : 'prev')) {
              drag.current.active = false;
              return;
            }
          }

          const progress = Math.max(0, Math.min(1, Math.abs(dx) / drag.current.halfWidth));
          setState((s) => (s.turning ? { ...s, turning: { ...s.turning, progress } } : s));
        },

        onPointerUp(e: React.PointerEvent) {
          if (!drag.current.active) return;
          drag.current.active = false;
          capturePointer(e.currentTarget as Element, e.pointerId, false);

          // Gerakan di bawah ambang = klik, bukan drag.
          if (!drag.current.moved) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const isRightHalf = e.clientX - rect.left > rect.width / 2;
            if (isRightHalf) next();
            else prev();
            return;
          }

          const turning = stateRef.current.turning;
          if (!turning) return;
          animateTo(turning.progress > COMMIT_THRESHOLD ? 1 : 0);
        },

        onPointerCancel() {
          if (!drag.current.active) return;
          drag.current.active = false;
          if (stateRef.current.turning) animateTo(0);
        },
      };
    },
    [startTurn, animateTo, next, prev],
  );

  return {
    spread: state.spread,
    turning: state.turning,
    sheetCount,
    canPrev: state.spread > 0,
    canNext: state.spread < sheetCount,
    isAnimating: animatingRef.current,
    next,
    prev,
    goToSpread,
    goToPage,
    angleOf,
    bindDrag,
  };
}
