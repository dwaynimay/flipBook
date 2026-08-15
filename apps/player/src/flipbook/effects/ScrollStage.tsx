import { useEffect, useRef } from 'react';
import type { BookManifest } from '@flip/manifest';
import { PageFace } from '../PageFace';

interface Props {
  manifest: BookManifest;
  assetBase: string;
  currentPage: number;
  onPageChange(pageIndex: number): void;
  onLinkClick(link: { url?: string; targetPage?: number }): void;
}

/**
 * Efek scroll: satu kolom halaman berkelanjutan.
 *
 * Ini satu-satunya efek yang tidak memakai model spread — tidak ada lembar dan
 * tidak ada drag horizontal, jadi ia melewati kontroler flip sepenuhnya dan
 * memakai scroll native. Halaman aktif dilacak lewat IntersectionObserver,
 * yang jauh lebih murah daripada menghitung posisi di event scroll.
 */
export function ScrollStage({
  manifest,
  assetBase,
  currentPage,
  onPageChange,
  onLinkClick,
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visible = useRef(new Set<number>());
  // Cegah observer melaporkan balik halaman saat kita sendiri yang menggulir
  // ke sana — kalau tidak, lompatan dari daftar isi bisa saling meniadakan.
  const programmatic = useRef(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset['index']);
          if (entry.isIntersecting) visible.current.add(index);
          else visible.current.delete(index);
        }
        if (programmatic.current || visible.current.size === 0) return;
        onPageChange(Math.min(...visible.current));
      },
      { root, threshold: 0.5 },
    );

    for (const el of pageRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [onPageChange, manifest.pageCount]);

  // Gulir ke halaman yang diminta dari luar (daftar isi, pencarian, deep link).
  useEffect(() => {
    const el = pageRefs.current[currentPage];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rootRect = containerRef.current?.getBoundingClientRect();
    if (!rootRect) return;
    // Sudah terlihat — jangan paksa gulir, itu akan terasa seperti tersentak.
    if (rect.top >= rootRect.top - 4 && rect.top <= rootRect.bottom - rect.height / 2) return;

    programmatic.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = setTimeout(() => {
      programmatic.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [currentPage]);

  return (
    <div className="scroller" ref={containerRef}>
      {manifest.pages.map((page) => (
        <div
          key={page.index}
          className="scroller__page"
          data-index={page.index}
          ref={(el) => {
            pageRefs.current[page.index] = el;
          }}
          style={{ aspectRatio: `${page.width} / ${page.height}` }}
        >
          <PageFace
            page={page}
            assetBase={assetBase}
            wantFull={Math.abs(page.index - currentPage) <= 1}
            onLinkClick={onLinkClick}
          />
        </div>
      ))}
    </div>
  );
}
