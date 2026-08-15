/**
 * Batas abstraksi engine PDF.
 *
 * ⚠️ ATURAN: tidak ada kode di luar package ini yang boleh mengimpor
 * @hyzyla/pdfium atau pdfjs-dist secara langsung.
 *
 * Alasannya ada di docs/02-ARCHITECTURE.md §2.2 — pilihan engine belum final
 * (PDFium+pdf.js permisif vs MuPDF AGPL), dan ADR-001 akan memutuskannya lewat
 * spike. Selama semua konsumen hanya bicara ke interface ini, mengganti engine
 * adalah pekerjaan satu hari, bukan satu bulan.
 */
import type { LinkAnnot, OutlineNode } from '@flip/manifest';

export interface RenderedPage {
  /** Buffer gambar mentah RGBA. */
  data: Uint8Array;
  width: number;
  height: number;
}

export interface PageSize {
  /** Poin PDF (1/72 inci). */
  width: number;
  height: number;
}

export interface PdfDoc {
  pageCount(): number;
  getPageSize(index: number): PageSize;
  /** Render halaman pada skala tertentu (1 = 72 DPI). Mengembalikan RGBA mentah. */
  renderPage(index: number, scale: number): Promise<RenderedPage>;
  /** Teks polos halaman — untuk pencarian, aksesibilitas, dan SEO. */
  extractText(index: number): Promise<string>;
  /** Anotasi link, dikembalikan sebagai fraksi 0–1. */
  extractLinks(index: number): Promise<LinkAnnot[]>;
  outline(): Promise<OutlineNode[]>;
  destroy(): void;
}

export interface PdfEngine {
  readonly name: string;
  open(buffer: Uint8Array): Promise<PdfDoc>;
  destroy(): void;
}
