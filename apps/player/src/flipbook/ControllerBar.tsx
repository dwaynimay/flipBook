import type { SidebarTab } from './Sidebar';

interface Props {
  title: string;
  pageLabel: string;
  pageCount: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  activeTab: SidebarTab | null;
  shareOpen: boolean;
  onZoomChange(value: number): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onToggleSidebar(tab: SidebarTab): void;
  onToggleShare(): void;
  onToggleHideControls?(): void;
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function ControllerBar({
  title,
  pageLabel,
  pageCount,
  zoom,
  minZoom,
  maxZoom,
  activeTab,
  shareOpen,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onToggleSidebar,
  onToggleShare,
  onToggleHideControls,
}: Props): React.ReactElement {
  const zoomFill = ((zoom - minZoom) / (maxZoom - minZoom)) * 100;
  return (
    <nav className="controller" aria-label="Kontrol flipbook">
      <div className="controller__group controller__group--start">
        <button
          type="button"
          onClick={() => onToggleSidebar('thumbs')}
          aria-pressed={activeTab === 'thumbs'}
          aria-label="Daftar halaman"
          title="Daftar halaman"
        >
          <GridIcon />
        </button>
        <button
          type="button"
          onClick={() => onToggleSidebar('toc')}
          aria-pressed={activeTab === 'toc'}
          aria-label="Daftar isi"
          title="Daftar isi"
        >
          <ListIcon />
        </button>
        <button
          type="button"
          onClick={() => onToggleSidebar('search')}
          aria-pressed={activeTab === 'search'}
          aria-label="Cari"
          title="Cari"
        >
          <SearchIcon />
        </button>
        <span className="controller__title" title={title}>
          {title}
        </span>
      </div>

      <div className="controller__group">
        <span className="controller__pages" aria-live="polite">
          {pageLabel} <span className="controller__sep">/</span> {pageCount}
        </span>
      </div>

      <div className="controller__group controller__group--end">
        <button type="button" onClick={onZoomOut} disabled={zoom <= minZoom} aria-label="Perkecil">
          −
        </button>
        <input
          type="range"
          className="zoom-slider"
          min={minZoom}
          max={maxZoom}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{ '--fill': `${zoomFill}%` } as React.CSSProperties}
          aria-label="Level perbesaran"
        />
        <button type="button" onClick={onZoomIn} disabled={zoom >= maxZoom} aria-label="Perbesar">
          +
        </button>
        <button
          type="button"
          onClick={onToggleShare}
          aria-pressed={shareOpen}
          aria-label="Bagikan"
          title="Bagikan"
        >
          <ShareIcon />
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Layar penuh" title="Layar penuh">
          <FullscreenIcon />
        </button>
        {onToggleHideControls && (
          <button
            type="button"
            onClick={onToggleHideControls}
            aria-label="Sembunyikan navigasi"
            title="Sembunyikan navigasi"
          >
            <ChevronDownIcon />
          </button>
        )}
      </div>
    </nav>
  );
}

/* ---------------- ikon ---------------- */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Icon({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {children}
    </svg>
  );
}

export function Chevron({ direction }: { direction: 'left' | 'right' }): React.ReactElement {
  return <Icon>{<path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} {...stroke} />}</Icon>;
}

function GridIcon(): React.ReactElement {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="8" {...stroke} />
      <rect x="14" y="3" width="7" height="8" {...stroke} />
      <rect x="3" y="14" width="7" height="8" {...stroke} />
      <rect x="14" y="14" width="7" height="8" {...stroke} />
    </Icon>
  );
}

function ListIcon(): React.ReactElement {
  return (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h10" {...stroke} />
    </Icon>
  );
}

function SearchIcon(): React.ReactElement {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="M20 20l-4.3-4.3" {...stroke} />
    </Icon>
  );
}

function ShareIcon(): React.ReactElement {
  return (
    <Icon>
      <circle cx="18" cy="5" r="2.5" {...stroke} />
      <circle cx="6" cy="12" r="2.5" {...stroke} />
      <circle cx="18" cy="19" r="2.5" {...stroke} />
      <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" {...stroke} />
    </Icon>
  );
}

function FullscreenIcon(): React.ReactElement {
  return (
    <Icon>
      <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" {...stroke} />
    </Icon>
  );
}

export function ChevronDownIcon(): React.ReactElement {
  return (
    <Icon>
      <path d="M6 9l6 6 6-6" {...stroke} />
    </Icon>
  );
}

export function ChevronUpIcon(): React.ReactElement {
  return (
    <Icon>
      <path d="M18 15l-6-6-6 6" {...stroke} />
    </Icon>
  );
}
