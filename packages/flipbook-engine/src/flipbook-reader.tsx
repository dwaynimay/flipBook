import { ChevronLeft, ChevronRight, Rows3 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import type { FlipbookPage, ReaderMode, ReaderPageChange } from "./contracts.js";
import {
  createEngineSession,
  type EnginePortalTarget,
  type EngineSession,
} from "./engine-session.js";
import { findPageIndex, pageChangeFromIndex } from "./page-mapping.js";

export interface FlipbookReaderProps {
  readonly initialPageId?: string;
  readonly onEngineError?: (error: Error) => void;
  readonly onModeChange?: (mode: ReaderMode) => void;
  readonly onPageChange?: (change: ReaderPageChange) => void;
  readonly pages: readonly FlipbookPage[];
}

function errorFromUnknown(value: unknown): Error {
  return value instanceof Error ? value : new Error("Page-flip engine failed.");
}

function pageSetSignature(pages: readonly FlipbookPage[]): string {
  return JSON.stringify(pages.map((page) => [page.pageId, page.isCover === true]));
}

function useVerticalPreference(): boolean {
  const [vertical, setVertical] = useState(false);

  useEffect(() => {
    const narrowQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setVertical(narrowQuery.matches || motionQuery.matches);
    update();
    narrowQuery.addEventListener("change", update);
    motionQuery.addEventListener("change", update);
    return () => {
      narrowQuery.removeEventListener("change", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  return vertical;
}

export function FlipbookReader({
  initialPageId,
  onEngineError,
  onModeChange,
  onPageChange,
  pages,
}: FlipbookReaderProps) {
  const preferredVertical = useVerticalPreference();
  const [engineFailed, setEngineFailed] = useState(false);
  const [engineBusy, setEngineBusy] = useState(false);
  const [portalTargets, setPortalTargets] = useState<readonly EnginePortalTarget[]>([]);
  const [currentIndex, setCurrentIndex] = useState(() => {
    return findPageIndex(pages, initialPageId);
  });
  const currentPageIdRef = useRef(pages[currentIndex]?.pageId);
  const engineRef = useRef<EngineSession | null>(null);
  const onEngineErrorRef = useRef(onEngineError);
  const onModeChangeRef = useRef(onModeChange);
  const onPageChangeRef = useRef(onPageChange);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLElement | null>(null);
  onEngineErrorRef.current = onEngineError;
  onModeChangeRef.current = onModeChange;
  onPageChangeRef.current = onPageChange;
  const mode: ReaderMode = preferredVertical || engineFailed ? "vertical" : "flip";
  const enginePageSignature = pageSetSignature(pages);
  const rememberedIndex = pages.findIndex((page) => page.pageId === currentPageIdRef.current);
  const resolvedIndex =
    pages.length === 0
      ? -1
      : rememberedIndex >= 0
        ? rememberedIndex
        : Math.max(0, Math.min(currentIndex, pages.length - 1));

  useEffect(() => {
    onModeChangeRef.current?.(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "flip") return undefined;
    const host = hostRef.current;
    if (host === null || pages.length === 0) return undefined;

    let session: EngineSession | null = null;
    try {
      session = createEngineSession(host, pages, resolvedIndex, {
        onBusyChange: setEngineBusy,
        onPageChange: (change) => {
          setCurrentIndex(change.index);
          currentPageIdRef.current = change.pageId;
          onPageChangeRef.current?.(change);
        },
      });
      engineRef.current = session;
      setPortalTargets(session.portalTargets);

      return () => {
        setPortalTargets([]);
        queueMicrotask(() => {
          try {
            session?.destroy();
          } catch (error) {
            onEngineErrorRef.current?.(errorFromUnknown(error));
          }
        });
        engineRef.current = null;
      };
    } catch (error) {
      session?.destroy();
      const normalized = errorFromUnknown(error);
      setEngineFailed(true);
      onEngineErrorRef.current?.(normalized);
      return undefined;
    }
  }, [enginePageSignature, mode]);

  useEffect(() => {
    if (mode !== "vertical" || pages.length === 0 || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const root = readerRef.current;
    if (root === null) return undefined;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageId = (entry.target as HTMLElement).dataset.verticalPageId;
          if (pageId !== undefined)
            ratios.set(pageId, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        const visible = [...ratios.entries()].sort((left, right) => right[1] - left[1])[0];
        if (visible === undefined || visible[1] <= 0) return;
        const index = pages.findIndex((page) => page.pageId === visible[0]);
        const change = pageChangeFromIndex(pages, index);
        if (change !== undefined && change.index !== resolvedIndex) {
          setCurrentIndex(change.index);
          currentPageIdRef.current = change.pageId;
          onPageChangeRef.current?.(change);
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    for (const element of root.querySelectorAll<HTMLElement>("[data-vertical-page-id]")) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [mode, pages, resolvedIndex]);

  const goTo = (nextIndex: number): void => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, pages.length - 1));
    const nextPage = pages[boundedIndex];
    if (nextPage === undefined) return;
    if (mode === "flip") {
      if (engineBusy || Math.abs(boundedIndex - resolvedIndex) !== 1) return;
      setEngineBusy(true);
      if (boundedIndex > resolvedIndex) engineRef.current?.flipNext();
      else engineRef.current?.flipPrevious();
      return;
    }

    setCurrentIndex(boundedIndex);
    currentPageIdRef.current = nextPage.pageId;
    onPageChangeRef.current?.({ index: boundedIndex, pageId: nextPage.pageId });

    const verticalPage = [
      ...(readerRef.current?.querySelectorAll<HTMLElement>("[data-vertical-page-id]") ?? []),
    ].find((element) => element.dataset.verticalPageId === nextPage.pageId);
    verticalPage?.scrollIntoView({
      behavior: preferredVertical ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-reader-interactive='true']") !== null
    )
      return;
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      goTo(resolvedIndex + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      goTo(resolvedIndex - 1);
    }
  };

  return (
    <section
      aria-label="Pembaca booklet"
      className={`flipbook-reader flipbook-reader--${mode}`}
      onKeyDown={handleKeyDown}
      ref={readerRef}
      tabIndex={0}
    >
      {pages.length === 0 ? (
        <div className="flipbook-empty" role="status">
          Booklet ini belum memiliki halaman.
        </div>
      ) : mode === "flip" ? (
        <>
          <div className="flipbook-stage" ref={hostRef} />
          {portalTargets.map((target) => {
            const page = pages.find((candidate) => candidate.pageId === target.pageId);
            return page === undefined
              ? null
              : createPortal(page.content, target.element, page.pageId);
          })}
        </>
      ) : (
        <div className="vertical-reader">
          <div className="vertical-reader__notice">
            <Rows3 aria-hidden="true" size={17} /> Mode baca vertikal aktif
          </div>
          {pages.map((page) => (
            <div
              className="vertical-reader__page"
              data-vertical-page-id={page.pageId}
              key={page.pageId}
            >
              {page.content}
            </div>
          ))}
        </div>
      )}

      <nav aria-label="Navigasi halaman" className="flipbook-navigation">
        <button
          aria-label="Halaman sebelumnya"
          disabled={pages.length === 0 || resolvedIndex === 0 || engineBusy}
          onClick={() => goTo(resolvedIndex - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <span>
          <strong>{resolvedIndex + 1}</strong> / {pages.length}
        </span>
        <button
          aria-label="Halaman berikutnya"
          disabled={pages.length === 0 || resolvedIndex >= pages.length - 1 || engineBusy}
          onClick={() => goTo(resolvedIndex + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </nav>
    </section>
  );
}
