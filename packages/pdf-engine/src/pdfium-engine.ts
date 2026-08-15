/**
 * Implementasi PdfEngine berbasis PDFium (engine PDF milik Chrome).
 *
 * Lisensi: PDFium = BSD-3-Clause, wrapper @hyzyla/pdfium = MIT.
 * Keduanya permisif — tidak ada kewajiban copyleft. Ini jalur yang dipilih
 * di docs/02-ARCHITECTURE.md §2.2 sambil menunggu ADR-001.
 *
 * Render + teks ditangani PDFium. Anotasi link ditangani pdf.js (Apache-2.0),
 * karena wrapper PDFium tidak mengeksposnya.
 */
import { PDFiumLibrary, type PDFiumDocument } from '@hyzyla/pdfium';
import type { LinkAnnot, OutlineNode } from '@flip/manifest';
import type { PdfDoc, PdfEngine, PageSize, RenderedPage } from './types.js';
import { extractLinksWithPdfJs, extractOutlineWithPdfJs } from './pdfjs-annots.js';

/**
 * Catatan urutan kanal warna.
 *
 * Konstanta di sumber wrapper menyebut FPDFBitmap.BGRA, yang mengesankan buffer
 * perlu ditukar sebelum diserahkan ke sharp (yang membaca raw 4-kanal sebagai
 * RGBA). Itu KELIRU untuk build WASM ini — diverifikasi dengan membaca piksel
 * dari halaman uji berblok merah/hijau/biru di fixtures/make-test-pdf.mjs:
 * tanpa penukaran, blok merah keluar rgb(217,38,38) sesuai sumbernya; dengan
 * penukaran, ia berubah jadi rgb(37,38,218).
 *
 * Jadi buffer diteruskan apa adanya. Jangan "perbaiki" ini tanpa menjalankan
 * ulang pemeriksaan piksel tersebut — namanya menyesatkan, datanya tidak.
 */

class PdfiumDoc implements PdfDoc {
  #doc: PDFiumDocument;
  #source: Uint8Array;
  /**
   * Satu promise untuk seluruh dokumen, bukan cache per halaman.
   * Membuka ulang dokumen pdf.js per halaman jauh lebih mahal daripada
   * memindai sekali — dan menyimpan promise-nya (bukan hasilnya) memastikan
   * pemindaian tetap sekali jalan meski beberapa halaman meminta bersamaan
   * atau pemindaian itu gagal.
   */
  #linksPromise: Promise<Map<number, LinkAnnot[]>> | null = null;

  constructor(doc: PDFiumDocument, source: Uint8Array) {
    this.#doc = doc;
    this.#source = source;
  }

  pageCount(): number {
    return this.#doc.getPageCount();
  }

  getPageSize(index: number): PageSize {
    const { originalWidth, originalHeight } = this.#doc.getPage(index).getOriginalSize();
    return { width: originalWidth, height: originalHeight };
  }

  async renderPage(index: number, scale: number): Promise<RenderedPage> {
    const page = this.#doc.getPage(index);
    // render: 'bitmap' mengembalikan buffer mentah tanpa encoding.
    // Encoding ke WebP dilakukan di worker agar engine tetap bebas format.
    const result = await page.render({ scale, render: 'bitmap' });
    return { data: result.data, width: result.width, height: result.height };
  }

  async extractText(index: number): Promise<string> {
    return this.#doc.getPage(index).getText();
  }

  async extractLinks(index: number): Promise<LinkAnnot[]> {
    this.#linksPromise ??= extractLinksWithPdfJs(this.#source);
    const all = await this.#linksPromise;
    return all.get(index) ?? [];
  }

  async outline(): Promise<OutlineNode[]> {
    return extractOutlineWithPdfJs(this.#source);
  }

  destroy(): void {
    this.#doc.destroy();
  }
}

export class PdfiumEngine implements PdfEngine {
  readonly name = 'pdfium';
  #library: Awaited<ReturnType<typeof PDFiumLibrary.init>> | null = null;

  static async create(): Promise<PdfiumEngine> {
    const engine = new PdfiumEngine();
    engine.#library = await PDFiumLibrary.init();
    return engine;
  }

  async open(buffer: Uint8Array): Promise<PdfDoc> {
    if (!this.#library) throw new Error('PdfiumEngine belum diinisialisasi — pakai PdfiumEngine.create()');
    // pdf.js memakan buffer-nya (transfer), jadi simpan salinan untuk ekstraksi anotasi.
    const doc = await this.#library.loadDocument(buffer);
    return new PdfiumDoc(doc, new Uint8Array(buffer));
  }

  destroy(): void {
    this.#library?.destroy();
    this.#library = null;
  }
}
