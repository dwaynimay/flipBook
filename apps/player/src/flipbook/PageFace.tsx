import { useEffect, useState } from 'react';
import type { PageManifest } from '@flip/manifest';

/**
 * Satu sisi halaman, dengan pemuatan progresif thumb → preview → full.
 *
 * Thumbnail dipasang sebagai background yang di-blur sehingga halaman tidak
 * pernah tampil kosong; varian yang lebih tajam menimpanya begitu selesai
 * dimuat. Gambar selalu di-preload lewat objek Image terpisah sebelum di-swap,
 * supaya tidak pernah ada kedipan setengah-muat.
 * Lihat docs/02-ARCHITECTURE.md §5.3.
 */

interface Props {
  page: PageManifest | null;
  assetBase: string;
  /** Muat varian resolusi penuh — hanya untuk halaman yang sedang dilihat & diam. */
  wantFull: boolean;
  onLinkClick(target: { url?: string; targetPage?: number }): void;
}

function preload(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`gagal memuat ${src}`));
    img.src = src;
  });
}

export function PageFace({ page, assetBase, wantFull, onLinkClick }: Props): React.ReactElement {
  const thumb = page ? `${assetBase}/${page.assets.thumb}` : null;
  const preview = page ? `${assetBase}/${page.assets.preview}` : null;
  const full = page?.assets.full ? `${assetBase}/${page.assets.full}` : null;

  const [src, setSrc] = useState<string | null>(thumb);

  // Naikkan ke preview segera setelah halaman ini masuk jendela render.
  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    setSrc(thumb);
    preload(preview)
      .then(() => {
        if (!cancelled) setSrc(preview);
      })
      .catch(() => {
        /* biarkan thumb yang tampil */
      });
    return () => {
      cancelled = true;
    };
  }, [preview, thumb]);

  // Naikkan ke full hanya saat halaman benar-benar dilihat dan sudah diam.
  useEffect(() => {
    if (!wantFull || !full) return;
    let cancelled = false;
    preload(full)
      .then(() => {
        if (!cancelled) setSrc(full);
      })
      .catch(() => {
        /* preview sudah cukup baik */
      });
    return () => {
      cancelled = true;
    };
  }, [wantFull, full]);

  if (!page) return <div className="face face--blank" aria-hidden="true" />;

  return (
    <div
      className="face"
      style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
      role="img"
      aria-label={`Halaman ${page.index + 1}`}
    >
      {src && <img className="face__img" src={src} alt="" draggable={false} />}

      {page.links.length > 0 && (
        <div className="face__links">
          {page.links.map((link, i) => (
            <button
              key={i}
              type="button"
              className="hotspot"
              style={{
                left: `${link.x * 100}%`,
                top: `${link.y * 100}%`,
                width: `${link.w * 100}%`,
                height: `${link.h * 100}%`,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick(link);
              }}
              aria-label={link.url ?? `Ke halaman ${(link.targetPage ?? 0) + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
