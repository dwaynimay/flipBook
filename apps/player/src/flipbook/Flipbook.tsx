import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BookManifest, PageManifest } from '@flip/manifest';
import { useFlipController } from './useFlipController';
import { FlipStage } from './effects/FlipStage';
import { Sidebar, type SidebarTab } from './Sidebar';
import { ShareMenu } from './ShareMenu';
import { ControllerBar, Chevron, ChevronUpIcon } from './ControllerBar';

/** Di bawah lebar ini, tampilkan satu halaman — dua halaman jadi terlalu kecil. */
const TWO_PAGE_MIN_WIDTH = 760;
const STAGE_PADDING = 32;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface Props {
  manifest: BookManifest;
  assetBase: string;
  initialPage: number;
  onPageChange(pageIndex: number): void;
}

export function Flipbook({
  manifest,
  assetBase,
  initialPage,
  onPageChange,
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [settled, setSettled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [isHoveringStage, setIsHoveringStage] = useState(false);

  const shouldShowControls = isHoveringControls || sidebarTab !== null || shareOpen;
  const shouldShowStageNav = isHoveringStage || shouldShowControls;

  const twoPage = viewport.width >= TWO_PAGE_MIN_WIDTH;

  const pageOf = useCallback(
    (index: number): PageManifest | null => manifest.pages[index] ?? null,
    [manifest],
  );

  const sheetCount = twoPage
    ? Math.ceil(manifest.pageCount / 2)
    : Math.max(0, manifest.pageCount - 1);

  const lastPageRef = useRef(initialPage);

  const handleSpreadChange = useCallback(
    (spread: number) => {
      const page = twoPage ? Math.max(0, spread * 2) : spread;
      lastPageRef.current = page;
      onPageChange(page);
    },
    [onPageChange, twoPage],
  );

  const flip = useFlipController(
    sheetCount,
    twoPage ? Math.ceil(initialPage / 2) : initialPage,
    handleSpreadChange,
  );
  const { spread, turning, angleOf } = flip;

  /** Halaman yang dianggap "sedang dibaca" — dipakai thumbnail & sidebar. */
  const currentPage = twoPage ? (spread === 0 ? 0 : spread * 2 - 1) : spread;

  // Ukur viewport.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = (width: number, height: number): void => {
      setViewport((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };

    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);

    const onResize = (): void => {
      const r = el.getBoundingClientRect();
      measure(r.width, r.height);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /**
   * Petakan ulang posisi saat tata letak berpindah antara satu dan dua halaman.
   *
   * `spread` punya arti berbeda di kedua mode: di dua halaman ia menghitung
   * lembar, di satu halaman ia menghitung halaman. Tanpa pemetaan ulang,
   * memutar perangkat atau mengubah ukuran jendela melempar pembaca ke posisi
   * acak — dan bila indeksnya melewati batas, ke halaman kosong.
   */
  const prevTwoPage = useRef(twoPage);
  useEffect(() => {
    if (prevTwoPage.current === twoPage) return;
    prevTwoPage.current = twoPage;
    const page = lastPageRef.current;
    flip.goToSpread(twoPage ? Math.ceil(page / 2) : page);
  }, [twoPage, flip]);

  // Varian resolusi penuh hanya dimuat setelah animasi benar-benar berhenti.
  useEffect(() => {
    if (turning) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), 300);
    return () => clearTimeout(timer);
  }, [turning, spread]);

  const stageRef = useRef<any>(null);

  const handleNext = useCallback(() => {
    if (stageRef.current?.flipNext) {
      stageRef.current.flipNext();
    } else {
      flip.next();
    }
  }, [flip]);

  const handlePrev = useCallback(() => {
    if (stageRef.current?.flipPrev) {
      stageRef.current.flipPrev();
    } else {
      flip.prev();
    }
  }, [flip]);

  const handleGoToSpread = useCallback(
    (targetSpread: number) => {
      const pageIndex = twoPage
        ? targetSpread === 0
          ? 0
          : targetSpread * 2 - 1
        : targetSpread;
      if (stageRef.current?.flipToPage) {
        stageRef.current.flipToPage(pageIndex);
      } else {
        flip.goToSpread(targetSpread);
      }
    },
    [flip, twoPage]
  );

  const goToPage = useCallback(
    (pageIndex: number) => {
      const clamped = Math.max(0, Math.min(manifest.pageCount - 1, pageIndex));
      lastPageRef.current = clamped;
      if (stageRef.current?.flipToPage) {
        stageRef.current.flipToPage(clamped);
      } else {
        flip.goToSpread(twoPage ? (clamped === 0 ? 0 : Math.ceil(clamped / 2)) : clamped);
      }
    },
    [flip, twoPage, manifest.pageCount],
  );

  // Navigasi keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      // Jangan bajak panah saat pembaca sedang mengetik di kotak pencarian.
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        handleGoToSpread(0);
      } else if (e.key === 'End') {
        handleGoToSpread(sheetCount);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev, handleGoToSpread, sheetCount]);

  /**
   * Sampul depan dan sampul belakang tampil sendirian, dipusatkan — tidak
   * ada halaman untuk mengisi slot pasangannya. Tanpa ini, kotak buku tetap
   * selebar dua halaman dengan separuh kosong transparan, dan sampul terlihat
   * "menepi" alih-alih di tengah, baru melompat ke tengah sungguhan begitu
   * buku dibuka. Hanya berlaku saat diam — begitu membalik dimulai, lembar
   * butuh kotak dua-halaman penuh supaya engselnya benar.
   */
  const soloAtEdge = twoPage && !turning && (spread === 0 || spread === sheetCount);
  const soloIndex = spread === 0 ? 0 : spread * 2 - 1;

  // Geometri: muat buku ke dalam viewport dengan mempertahankan rasio halaman.
  const layout = useMemo(() => {
    const first = manifest.pages[0];
    if (!first || viewport.width === 0 || viewport.height === 0) {
      return { pageWidth: 0, pageHeight: 0, bookWidth: 0 };
    }
    const pageAspect = first.width / first.height;
    const columns = twoPage ? 2 : 1;

    const availableWidth = Math.max(0, viewport.width - STAGE_PADDING * 2);
    const availableHeight = Math.max(0, viewport.height - STAGE_PADDING * 2);

    let pageHeight = availableHeight;
    let pageWidth = pageHeight * pageAspect;

    if (pageWidth * columns > availableWidth) {
      pageWidth = availableWidth / columns;
      pageHeight = pageWidth / pageAspect;
    }

    return { pageWidth, pageHeight, bookWidth: pageWidth * columns };
  }, [manifest.pages, viewport, twoPage]);

  const coverOffset = twoPage
    ? spread === 0
      ? -layout.pageWidth / 2
      : spread === sheetCount
        ? layout.pageWidth / 2
        : 0
    : 0;

  const dragHandlers = flip.bindDrag(layout.pageWidth);

  const handleLinkClick = useCallback(
    (link: { url?: string; targetPage?: number }) => {
      if (link.url) {
        window.open(link.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (typeof link.targetPage === 'number') goToPage(link.targetPage);
    },
    [goToPage],
  );

  const [seekingSpread, setSeekingSpread] = useState<number | null>(null);

  const activeSpread = seekingSpread !== null ? seekingSpread : spread;

  const handleSeekCommit = useCallback(
    (targetSpread: number) => {
      setSeekingSpread(null);
      handleGoToSpread(targetSpread);
    },
    [handleGoToSpread],
  );

  useEffect(() => {
    if (seekingSpread === null) return;

    const handleWindowUp = () => {
      handleSeekCommit(seekingSpread);
    };

    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [seekingSpread, handleSeekCommit]);

  const pageLabel = !twoPage
    ? String(activeSpread + 1)
    : activeSpread === 0
      ? '1'
      : activeSpread === sheetCount
        ? String(manifest.pageCount)
        : `${activeSpread * 2}–${Math.min(activeSpread * 2 + 1, manifest.pageCount)}`;

  // Panning saat di-zoom; drag flip dinonaktifkan agar tidak saling rebut gesture.
  const panRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const zoomHandlers = {
    onPointerDown(e: React.PointerEvent) {
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: pan.x,
        originY: pan.y,
      };
    },
    onPointerMove(e: React.PointerEvent) {
      if (!panRef.current.active) return;
      setPan({
        x: panRef.current.originX + (e.clientX - panRef.current.startX),
        y: panRef.current.originY + (e.clientY - panRef.current.startY),
      });
    },
    onPointerUp() {
      panRef.current.active = false;
    },
    onPointerCancel() {
      panRef.current.active = false;
    },
  };

  const handleZoomChange = useCallback((value: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    setZoom(next);
    if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 });
  }, []);

  // Update fungsional — klik tombol +/- beruntun harus terakumulasi dari nilai
  // TERBARU, bukan dari `zoom` yang sudah usang di closure render saat itu.
  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const toggleSidebar = useCallback((tab: SidebarTab) => {
    setSidebarTab((current) => (current === tab ? null : tab));
  }, []);

  const zoomed = zoom > MIN_ZOOM;

  const seekMax = sheetCount;
  const seekFill = seekMax > 0 ? (activeSpread / seekMax) * 100 : 0;
  const stageProps = {
    assetBase,
    spread,
    sheetCount,
    pages: manifest.pages,
    pageWidth: layout.pageWidth,
    pageHeight: layout.pageHeight,
    turning,
    angleOf,
    pageOf,
    settled,
    twoPage,
    soloIndex: null,
    onPageChange: (p: number) => {
      const sp = twoPage ? (p === 0 ? 0 : Math.ceil(p / 2)) : p;
      flip.goToSpread(sp);
    },
    onLinkClick: handleLinkClick,
  };

  return (
    <div className="flipbook" style={{ background: manifest.settings.backgroundColor }}>
      <div className="flipbook__main">
        {sidebarTab && (
          <Sidebar
            manifest={manifest}
            assetBase={assetBase}
            tab={sidebarTab}
            currentPage={currentPage}
            onGoToPage={goToPage}
            onClose={() => setSidebarTab(null)}
          />
        )}

        <div
          className="flipbook__stage"
          ref={containerRef}
          onMouseEnter={() => setIsHoveringStage(true)}
          onMouseLeave={() => setIsHoveringStage(false)}
        >
          {layout.pageWidth > 0 && (
            <div
              className="stage__viewport"
              style={{
                transform: `translate(${pan.x + coverOffset}px, ${pan.y}px) scale(${zoom})`,
                transition: zoomed ? 'none' : 'transform 0.3s ease-out',
              }}
              {...(zoomed ? zoomHandlers : undefined)}
            >
              <div
                className={`book${!twoPage ? ' book--single' : ''}`}
                style={{ width: layout.bookWidth, height: layout.pageHeight }}
              >
                <FlipStage ref={stageRef} {...stageProps} />
              </div>
            </div>
          )}

          <button
            type="button"
            className={`stage-nav stage-nav--prev ${!shouldShowStageNav ? 'stage-nav--hidden' : ''}`}
            onClick={handlePrev}
            disabled={!flip.canPrev}
            aria-label="Halaman sebelumnya"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className={`stage-nav stage-nav--next ${!shouldShowStageNav ? 'stage-nav--hidden' : ''}`}
            onClick={handleNext}
            disabled={!flip.canNext}
            aria-label="Halaman berikutnya"
          >
            <Chevron direction="right" />
          </button>
        </div>
      </div>

      <div
        className={`flipbook__controls ${!shouldShowControls ? 'flipbook__controls--hidden' : ''}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <input
          type="range"
          className="seekbar"
          min={0}
          max={seekMax}
          value={activeSpread}
          onChange={(e) => setSeekingSpread(Number(e.target.value))}
          style={{ '--fill': `${seekFill}%` } as React.CSSProperties}
          aria-label="Cari halaman"
        />

        <ControllerBar
          title={manifest.title}
          pageLabel={pageLabel}
          pageCount={manifest.pageCount}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          activeTab={sidebarTab}
          shareOpen={shareOpen}
          onZoomChange={handleZoomChange}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(-ZOOM_STEP)}
          onToggleSidebar={toggleSidebar}
          onToggleShare={() => setShareOpen((v) => !v)}
          onToggleHideControls={() => setIsHoveringControls(false)}
        />
      </div>

      {shareOpen && <ShareMenu title={manifest.title} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
