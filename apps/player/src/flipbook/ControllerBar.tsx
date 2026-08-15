import type { PageEffect } from '@flip/manifest';
import type { SidebarTab } from './Sidebar';

interface Props {
  title: string;
  pageLabel: string;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  zoomed: boolean;
  zoomDisabled: boolean;
  effect: PageEffect;
  activeTab: SidebarTab | null;
  shareOpen: boolean;
  onPrev(): void;
  onNext(): void;
  onToggleZoom(): void;
  onEffectChange(effect: PageEffect): void;
  onToggleSidebar(tab: SidebarTab): void;
  onToggleShare(): void;
}

const EFFECT_LABELS: Record<PageEffect, string> = {
  flip: 'Balik',
  slide: 'Geser',
  scroll: 'Gulir',
};

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function ControllerBar({
  title,
  pageLabel,
  pageCount,
  canPrev,
  canNext,
  zoomed,
  zoomDisabled,
  effect,
  activeTab,
  shareOpen,
  onPrev,
  onNext,
  onToggleZoom,
  onEffectChange,
  onToggleSidebar,
  onToggleShare,
}: Props): React.ReactElement {
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
        <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Halaman sebelumnya">
          <Chevron direction="left" />
        </button>
        <span className="controller__pages" aria-live="polite">
          {pageLabel} <span className="controller__sep">/</span> {pageCount}
        </span>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label="Halaman berikutnya">
          <Chevron direction="right" />
        </button>
      </div>

      <div className="controller__group controller__group--end">
        <div className="segmented" role="group" aria-label="Mode membaca">
          {(Object.keys(EFFECT_LABELS) as PageEffect[]).map((key) => (
            <button
              key={key}
              type="button"
              className={effect === key ? 'segmented__on' : undefined}
              aria-pressed={effect === key}
              onClick={() => onEffectChange(key)}
            >
              {EFFECT_LABELS[key]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleZoom}
          disabled={zoomDisabled}
          aria-pressed={zoomed}
          aria-label={zoomed ? 'Perkecil' : 'Perbesar'}
        >
          {zoomed ? '−' : '+'}
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
        <button type="button" onClick={toggleFullscreen} aria-label="Layar penuh">
          <FullscreenIcon />
        </button>
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

function Chevron({ direction }: { direction: 'left' | 'right' }): React.ReactElement {
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
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...stroke} />
    </Icon>
  );
}
