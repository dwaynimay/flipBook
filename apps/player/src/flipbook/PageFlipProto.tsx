import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import type { BookManifest, PageManifest } from '@flip/manifest';
import { PageFace } from './PageFace';

/**
 * Prototipe pembanding engine flip: react-pageflip (StPageFlip) alih-alih
 * FlipStage.tsx buatan sendiri. Sengaja berdiri sendiri, tidak menyentuh
 * Flipbook.tsx/useFlipController.ts sama sekali — supaya bisa dibandingkan
 * langsung dan gampang dibuang kalau tidak cocok.
 *
 * Belum ada: sidebar, seek bar, zoom, share, lompat-ke-halaman lewat link
 * internal. Cuma untuk menilai RASA membalik halamannya.
 */
interface Props {
  manifest: BookManifest;
  assetBase: string;
}

const STAGE_PADDING = 24;

export function PageFlipProto({ manifest, assetBase }: Props): React.ReactElement {
  const first = manifest.pages[0];
  const pageAspect = first ? first.width / first.height : 3 / 4;

  // `size="stretch"` mengabaikan tinggi kontainer — dia mengisi LEBAR lalu
  // menurunkan tinggi dari rasio halaman, tanpa peduli apakah hasilnya
  // muat secara vertikal (bisa meluber ke atas). Jadi di sini kita hitung
  // sendiri ukuran yang pas ke viewport (sama seperti `layout` di
  // Flipbook.tsx) dan pakai `size="fixed"` supaya perilakunya bisa ditebak.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = (): void => {
      const rect = el.getBoundingClientRect();
      const availableWidth = Math.max(0, rect.width - STAGE_PADDING * 2);
      const availableHeight = Math.max(0, rect.height - STAGE_PADDING * 2);
      // Dua halaman berdampingan saat dibuka — muat sepasang ke lebar yang ada.
      let pageHeight = availableHeight;
      let pageWidth = pageHeight * pageAspect;
      if (pageWidth * 2 > availableWidth) {
        pageWidth = availableWidth / 2;
        pageHeight = pageWidth / pageAspect;
      }
      setSize({ width: Math.round(pageWidth), height: Math.round(pageHeight) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageAspect]);

  const handleLinkClick = (link: { url?: string; targetPage?: number }): void => {
    if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
    // Lompat ke halaman lewat link internal belum didukung di prototipe ini.
  };

  /**
   * showCover:true membuat sampul kaku ("hard") DAN tampil sendirian — dua
   * hal itu terikat jadi satu, tidak bisa cuma ambil salah satunya. Karena
   * kita mau sampul tetap lentur seperti halaman lain tapi TETAP tampil
   * sendirian, triknya: sisipkan satu halaman kosong tembus pandang sebelum
   * sampul depan, supaya sampul otomatis "berpasangan" dengan yang kosong
   * itu — secara visual terlihat sendirian, padahal sebenarnya berpasangan.
   *
   * Sampul belakang butuh kosong pasangan juga, TAPI di ujung — dan syaratnya
   * kebalikan dari intuisi: gara-gara satu kosong sudah disisipkan di depan,
   * indeks sampul belakang ikut bergeser +1. Kalau jumlah halaman asli (N)
   * GENAP, indeks barunya jadi genap juga (posisi kiri, butuh pasangan kanan)
   * — tanpa kosong penutup dia jadi halaman yatim tanpa pasangan sama sekali,
   * dan keseluruhan buku kepental ke kiri (bukan cuma slot-nya yang kosong).
   * Kalau N ganjil, dia otomatis sudah berpasangan dengan halaman isi
   * sebelumnya (bukan sendirian, tapi setidaknya tidak rusak tampilannya).
   */
  const protoPages = useMemo((): Array<PageManifest | null> => {
    const withLeadingBlank: Array<PageManifest | null> = [null, ...manifest.pages];
    const needsTrailingBlank = manifest.pageCount % 2 === 0;
    return needsTrailingBlank ? [...withLeadingBlank, null] : withLeadingBlank;
  }, [manifest.pages, manifest.pageCount]);

  return (
    <div className="pageflip-proto" ref={wrapRef}>
      {size.width > 0 && (
        <HTMLFlipBook
          className="pageflip-proto__book"
          style={{}}
          width={size.width}
          height={size.height}
          size="fixed"
          minWidth={200}
          maxWidth={2200}
          minHeight={250}
          maxHeight={2800}
          startPage={0}
          drawShadow
          flippingTime={350}
          usePortrait
          startZIndex={10}
          autoSize
          maxShadowOpacity={0.5}
          // false — showCover:true menjadikan sampul depan/belakang "hard"
          // (kaku, tanpa lengkung kertas) dan tampil sendirian. Di sini semua
          // halaman disengaja disamakan pakai fisika lembut yang sama.
          showCover={false}
          mobileScrollSupport={false}
          clickEventForward
          useMouseEvents
          swipeDistance={30}
          showPageCorners
          disableFlipByClick={false}
        >
          {protoPages.map((page, i) =>
            page ? (
              <div key={page.index} className="pageflip-proto__page">
                <PageFace page={page} assetBase={assetBase} wantFull={false} onLinkClick={handleLinkClick} />
              </div>
            ) : (
              <div key={`blank-${i}`} className="pageflip-proto__page pageflip-proto__page--blank" />
            ),
          )}
        </HTMLFlipBook>
      )}
    </div>
  );
}
