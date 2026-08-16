import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BookManifest, PageManifest } from '@flip/manifest';
import { useFlipController } from './useFlipController';
import { FlipStage } from './effects/FlipStage';
import { Sidebar, type SidebarTab } from './Sidebar';
import { ShareMenu } from './ShareMenu';
import { ControllerBar, Chevron } from './ControllerBar';

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

  const twoPage = viewport.width >= TWO_PAGE_MIN_WIDTH;

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

  /** Halaman yang dianggap "sedang dibaca" — dipakai thumbnail & sidebar. */
  const currentPage = twoPage ? (spread === 0 ? 0 : spread * 2 - 1) : spread;

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

  const goToPage = useCallback(
    (pageIndex: number) => {
      const clamped = Math.max(0, Math.min(manifest.pageCount - 1, pageIndex));
      lastPageRef.current = clamped;
      flip.goToSpread(twoPage ? Math.ceil(clamped / 2) : clamped);
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
  }, [flip, sheetCount]);

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
    const columns = twoPage && !soloAtEdge ? 2 : 1;

    const availableWidth = Math.max(0, viewport.width - STAGE_PADDING * 2);
    const availableHeight = Math.max(0, viewport.height - STAGE_PADDING * 2);

    let pageHeight = availableHeight;
    let pageWidth = pageHeight * pageAspect;

    if (pageWidth * columns > availableWidth) {
      pageWidth = availableWidth / columns;
      pageHeight = pageWidth / pageAspect;
    }

    return { pageWidth, pageHeight, bookWidth: pageWidth * columns };
  }, [manifest.pages, viewport, twoPage, soloAtEdge]);

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

  const pageLabel = !twoPage
    ? String(spread + 1)
    : spread === 0
      ? '1'
      : spread === sheetCount
        ? String(manifest.pageCount)
        : `${spread * 2}–${Math.min(spread * 2 + 1, manifest.pageCount)}`;

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
  /**
   * Seek bar digerakkan lewat `spread`, BUKAN `currentPage`. `currentPage`
   * adalah nilai turunan (mis. 0,1,3,5,7,... di mode dua-halaman — angka
   * genap tidak pernah muncul), jadi kalau seek bar dipakukan ke rentang
   * halaman penuh, setengah dari posisi integer tidak pernah tercapai:
   * begitu drag lewat titik itu, render berikutnya menarik `value` balik ke
   * halaman valid terdekat, dan geseran terasa macet/nyentak. `spread` tidak
   * begini — setiap posisi memetakan satu status nyata, jadi selalu tuntas.
   */
  const seekMax = sheetCount;
  const seekFill = seekMax > 0 ? (spread / seekMax) * 100 : 0;
  const stageProps = {
    assetBase,
    spread,
    sheetCount,
    turning,
    angleOf,
    pageOf,
    settled,
    twoPage,
    soloIndex: soloAtEdge ? soloIndex : null,
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
          {layout.pageWidth > 0 && (
            <div
              className="stage__viewport"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              {...(zoomed ? zoomHandlers : dragHandlers)}
            >
              <div
                className={`book${!twoPage ? ' book--single' : ''}`}
                style={{ width: layout.bookWidth, height: layout.pageHeight }}
              >
                <FlipStage {...stageProps} />
              </div>
            </div>
          )}

          <button
            type="button"
            className="stage-nav stage-nav--prev"
            onClick={flip.prev}
            disabled={!flip.canPrev}
            aria-label="Halaman sebelumnya"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className="stage-nav stage-nav--next"
            onClick={flip.next}
            disabled={!flip.canNext}
            aria-label="Halaman berikutnya"
          >
            <Chevron direction="right" />
          </button>
        </div>
      </div>

      <div className="flipbook__controls">
        <input
          type="range"
          className="seekbar"
          min={0}
          max={seekMax}
          value={spread}
          onChange={(e) => flip.goToSpread(Number(e.target.value))}
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
        />
      </div>

      {shareOpen && <ShareMenu title={manifest.title} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
