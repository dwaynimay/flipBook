/**
 * Kontrak manifest publication.
 *
 * Manifest adalah satu-satunya hal yang dibutuhkan player untuk merender flipbook.
 * Player TIDAK pernah memparsing PDF — semua sudah diproses di worker.
 *
 * Aturan koordinat: semua geometri elemen/link disimpan sebagai FRAKSI 0–1
 * relatif terhadap dimensi halaman, tidak pernah piksel. Lihat docs/02-ARCHITECTURE.md ADR #4.
 */

export const MANIFEST_VERSION = 1 as const;

/** Varian resolusi halaman. `full` boleh null (lazy-generate saat zoom). */
export interface PageAssets {
  thumb: string;
  preview: string;
  full: string | null;
}

/** Persegi ternormalisasi: semua nilai 0–1 relatif terhadap ukuran halaman. */
export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LinkAnnot extends NormRect {
  /** URL eksternal. Saling eksklusif dengan targetPage. */
  url?: string;
  /** Indeks halaman internal berbasis 0. */
  targetPage?: number;
}

export interface PageManifest {
  /** Indeks berbasis 0. */
  index: number;
  /** Dimensi halaman PDF asli dalam poin. Dipakai untuk rasio aspek. */
  width: number;
  height: number;
  assets: PageAssets;
  links: LinkAnnot[];
}

export interface OutlineNode {
  title: string;
  page: number;
  children: OutlineNode[];
}

export type PageEffect = 'flip' | 'slide' | 'scroll';

/**
 * Indeks pencarian disimpan TERPISAH dari manifest dan dimuat malas saat
 * pembaca pertama kali membuka pencarian.
 *
 * Alasannya soal ukuran: teks lengkap dokumen 500 halaman bisa berlipat kali
 * lebih besar daripada manifest itu sendiri, dan manifest berada di jalur
 * kritis render halaman pertama. Mayoritas pembaca tidak pernah mencari.
 */
export interface SearchIndex {
  pages: Array<{ index: number; text: string }>;
}

export interface BookManifest {
  manifestVersion: typeof MANIFEST_VERSION;
  id: string;
  title: string;
  pageCount: number;
  /** Basis URL untuk aset halaman, relatif terhadap lokasi manifest. */
  assetBase: string;
  /** Path relatif ke indeks pencarian, atau null bila dokumen tanpa teks. */
  searchIndex: string | null;
  pages: PageManifest[];
  outline: OutlineNode[];
  settings: {
    effect: PageEffect;
    /** Halaman pertama tampil sendirian sebagai sampul. */
    coverAlone: boolean;
    backgroundColor: string;
  };
  createdAt: string;
}

/** Validasi runtime — manifest datang dari jaringan, jangan dipercaya buta. */
export function isBookManifest(value: unknown): value is BookManifest {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Partial<BookManifest>;
  return (
    m.manifestVersion === MANIFEST_VERSION &&
    typeof m.id === 'string' &&
    typeof m.pageCount === 'number' &&
    Array.isArray(m.pages) &&
    m.pages.length === m.pageCount
  );
}
