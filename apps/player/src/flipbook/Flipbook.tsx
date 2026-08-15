import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BookManifest, PageEffect, PageManifest } from '@flip/manifest';
import { useFlipController } from './useFlipController';
import { FlipStage } from './effects/FlipStage';
import { SlideStage } from './effects/SlideStage';
import { ScrollStage } from './effects/ScrollStage';
import { Sidebar, type SidebarTab } from './Sidebar';
import { ShareMenu } from './ShareMenu';
import { ControllerBar } from './ControllerBar';

/** Di bawah lebar ini, tampilkan satu halaman — dua halaman jadi terlalu kecil. */
const TWO_PAGE_MIN_WIDTH = 760;
const STAGE_PADDING = 32;

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
  const [effect, setEffect] = useState<PageEffect>(manifest.settings.effect);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [scrollPage, setScrollPage] = useState(initialPage);

  const twoPage = viewport.width >= TWO_PAGE_MIN_WIDTH;
  const isScroll = effect === 'scroll';

  const pageOf = useCallback(
    (index: number): PageManifest | null => manifest.pages[index] ?? null,
    [manifest],
  );

  const sheetCount = twoPage
    ? Math.ceil(manifest.pageCount / 2)
    : Math.max(0, manifest.pageCount - 1);

  /**
   * Halaman terakhir yang benar-benar dituju pembaca.
   *
   * Ini sumber kebenaran yang bertahan saat tata letak berpindah antara satu
   * dan dua halaman — `spread` tidak bisa dipakai untuk itu, karena artinya
   * berubah total di antara kedua mode.
   */
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

  /** Halaman yang dianggap "sedang dibaca" — dipakai thumbnail & scroll. */
  const currentPage = isScroll ? scrollPage : twoPage ? (spread === 0 ? 0 : spread * 2 - 1) : spread;

  // Ukur viewport.
  //
  // Pengukuran pertama dilakukan langsung dan sinkron — TIDAK menunggu
  // ResizeObserver. Callback RO hanya dikirim saat browser memproduksi frame,
  // sehingga di tab background, iframe tersembunyi, atau pane yang belum
  // ditampilkan, flipbook akan diam kosong selamanya kalau kita hanya
  // mengandalkan RO. Observer tetap dipasang untuk perubahan berikutnya.
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
  }, [sidebarTab]);

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
    if (isScroll) return;
    const page = lastPageRef.current;
    flip.goToSpread(twoPage ? Math.ceil(page / 2) : page);
  }, [twoPage, isScroll, flip]);

  // Varian resolusi penuh hanya dimuat setelah animasi benar-benar berhenti.
  useEffect(() => {
    if (turning) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), 300);
    return () => clearTimeout(timer);
  }, [turning, spread]);

  const goToPage = useCallback(
    (pageIndex: number) => {
      const clamped = Math.max(0, Math.min(manifest.pageCount - 1, pageIndex));
      lastPageRef.current = clamped;
      if (isScroll) {
        setScrollPage(clamped);
        onPageChange(clamped);
        return;
      }
      flip.goToSpread(twoPage ? Math.ceil(clamped / 2) : clamped);
    },
    [isScroll, flip, twoPage, manifest.pageCount, onPageChange],
  );

  const handleScrollPageChange = useCallback(
    (pageIndex: number) => {
      lastPageRef.current = pageIndex;
      setScrollPage(pageIndex);
      onPageChange(pageIndex);
    },
    [onPageChange],
  );

  /**
   * Jaga posisi baca saat pembaca berganti mode. Mode gulir melacak halaman
   * secara langsung, mode balik/geser lewat spread — keduanya perlu
   * disinkronkan lewat halaman terakhir yang dituju.
   */
  const prevEffect = useRef(effect);
  useEffect(() => {
    if (prevEffect.current === effect) return;
    const wasScroll = prevEffect.current === 'scroll';
    prevEffect.current = effect;
    const page = lastPageRef.current;
    if (isScroll) setScrollPage(page);
    else if (wasScroll) flip.goToSpread(twoPage ? Math.ceil(page / 2) : page);
  }, [effect, isScroll, twoPage, flip]);

  // Navigasi keyboard. Di mode scroll, biarkan browser menangani scroll native.
  useEffect(() => {
    if (isScroll) return;
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      // Jangan bajak panah saat pembaca sedang mengetik di kotak pencarian.
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        flip.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flip.prev();
      } else if (e.key === 'Home') {
        flip.goToSpread(0);
      } else if (e.key === 'End') {
        flip.goToSpread(sheetCount);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, sheetCount, isScroll]);

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

  const pageLabel = isScroll
    ? String(currentPage + 1)
    : twoPage
      ? spread === 0
        ? '1'
        : `${Math.min(spread * 2, manifest.pageCount)}–${Math.min(spread * 2 + 1, manifest.pageCount)}`
      : String(spread + 1);

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

  const toggleZoom = useCallback(() => {
    setZoom((z) => {
      const next = z === 1 ? 2 : 1;
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const toggleSidebar = useCallback((tab: SidebarTab) => {
    setSidebarTab((current) => (current === tab ? null : tab));
  }, []);

  const zoomed = zoom !== 1;
  const stageProps = {
    assetBase,
    spread,
    sheetCount,
    turning,
    angleOf,
    pageOf,
    settled,
    twoPage,
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

        <div className="flipbook__stage" ref={containerRef}>
          {isScroll ? (
            <ScrollStage
              manifest={manifest}
              assetBase={assetBase}
              currentPage={currentPage}
              onPageChange={handleScrollPageChange}
              onLinkClick={handleLinkClick}
            />
          ) : (
            layout.pageWidth > 0 && (
              <div
                className="stage__viewport"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                {...(zoomed ? zoomHandlers : dragHandlers)}
              >
                <div
                  className={`book${effect === 'slide' ? ' book--slide' : ''}${!twoPage ? ' book--single' : ''}`}
                  style={{ width: layout.bookWidth, height: layout.pageHeight }}
                >
                  {effect === 'flip' ? <FlipStage {...stageProps} /> : <SlideStage {...stageProps} />}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <ControllerBar
        title={manifest.title}
        pageLabel={pageLabel}
        pageCount={manifest.pageCount}
        canPrev={isScroll ? currentPage > 0 : flip.canPrev}
        canNext={isScroll ? currentPage < manifest.pageCount - 1 : flip.canNext}
        zoomed={zoomed}
        zoomDisabled={isScroll}
        effect={effect}
        activeTab={sidebarTab}
        shareOpen={shareOpen}
        onPrev={() => (isScroll ? goToPage(currentPage - 1) : flip.prev())}
        onNext={() => (isScroll ? goToPage(currentPage + 1) : flip.next())}
        onToggleZoom={toggleZoom}
        onEffectChange={setEffect}
        onToggleSidebar={toggleSidebar}
        onToggleShare={() => setShareOpen((v) => !v)}
      />

      {shareOpen && <ShareMenu title={manifest.title} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
