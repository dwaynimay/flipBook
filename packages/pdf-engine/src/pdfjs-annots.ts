/**
 * Ekstraksi anotasi link dan outline via pdf.js (Apache-2.0).
 *
 * PDFium menangani render dan teks jauh lebih cepat, tapi wrapper-nya tidak
 * mengekspos anotasi link maupun outline. pdf.js menutup celah itu — dan
 * lisensinya sama-sama permisif, jadi tidak ada risiko copyleft.
 *
 * Semua geometri dikembalikan sebagai fraksi 0–1 (lihat ADR #4).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LinkAnnot, OutlineNode } from '@flip/manifest';

/**
 * pdf.js memperingatkan soal standardFontDataUrl bahkan saat kita hanya
 * membaca anotasi. Font-nya ikut terpaket di pdfjs-dist, jadi tunjuk saja ke
 * sana — output yang bersih itu penting supaya peringatan asli tidak
 * tenggelam di antara peringatan yang bisa diabaikan.
 */
const STANDARD_FONT_DATA_URL = (() => {
  try {
    const require = createRequire(import.meta.url);
    const root = dirname(require.resolve('pdfjs-dist/package.json'));
    return pathToFileURL(join(root, 'standard_fonts/')).href;
  } catch {
    return undefined;
  }
})();

// pdf.js v6 tidak punya exports map; impor path dalam adalah jalur resmi untuk Node.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function withDocument<T>(
  source: Uint8Array,
  fn: (doc: Awaited<ReturnType<PdfJsModule['getDocument']>['promise']>, pdfjs: PdfJsModule) => Promise<T>,
): Promise<T> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    // Salin: pdf.js mentransfer kepemilikan buffer dan akan mengosongkannya.
    data: new Uint8Array(source),
    // Node tidak butuh worker terpisah; jalankan di thread yang sama.
    useWorkerFetch: false,
    useSystemFonts: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const doc = await task.promise;
  try {
    return await fn(doc, pdfjs);
  } finally {
    // destroy() ada di loading task, bukan di document proxy —
    // proxy hanya punya cleanup(). Memanggil doc.destroy() akan melempar.
    await task.destroy();
  }
}

/**
 * Mengembalikan peta indeks-halaman → daftar link.
 * Dokumen dibuka sekali dan seluruh halaman dipindai, karena membuka ulang
 * dokumen per halaman jauh lebih mahal.
 */
export async function extractLinksWithPdfJs(source: Uint8Array): Promise<Map<number, LinkAnnot[]>> {
  const result = new Map<number, LinkAnnot[]>();

  try {
    await withDocument(source, async (doc) => {
      for (let i = 0; i < doc.numPages; i++) {
        const page = await doc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1 });
        const [pw, ph] = [viewport.width, viewport.height];
        const links: LinkAnnot[] = [];

        const annots = await page.getAnnotations({ intent: 'display' });
        for (const a of annots as Array<Record<string, unknown>>) {
          if (a.subtype !== 'Link') continue;
          const rect = a.rect as [number, number, number, number] | undefined;
          if (!rect) continue;

          // rect PDF berasal dari kiri-bawah; player memakai kiri-atas.
          const [x0, y0, x1, y1] = rect;
          const x = Math.min(x0, x1);
          const y = Math.min(y0, y1);
          const w = Math.abs(x1 - x0);
          const h = Math.abs(y1 - y0);
          if (w <= 0 || h <= 0) continue;

          const base = {
            x: x / pw,
            y: 1 - (y + h) / ph,
            w: w / pw,
            h: h / ph,
          };

          const url = typeof a.url === 'string' ? a.url : undefined;
          if (url) {
            links.push({ ...base, url });
            continue;
          }

          // Link internal: selesaikan destination jadi indeks halaman.
          const dest = a.dest;
          if (dest != null) {
            try {
              const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
              if (Array.isArray(explicit) && explicit[0]) {
                const pageIndex = await doc.getPageIndex(explicit[0] as never);
                links.push({ ...base, targetPage: pageIndex });
              }
            } catch {
              // Destination rusak — lewati link ini, jangan gagalkan konversi.
            }
          }
        }

        if (links.length > 0) result.set(i, links);
        page.cleanup();
      }
    });
  } catch (err) {
    // Ekstraksi link bersifat best-effort. Kegagalan di sini tidak boleh
    // menggagalkan seluruh konversi — flipbook tanpa link tetap berguna.
    console.warn(`  ! ekstraksi link dilewati: ${(err as Error).message}`);
  }

  return result;
}

export async function extractOutlineWithPdfJs(source: Uint8Array): Promise<OutlineNode[]> {
  try {
    return await withDocument(source, async (doc) => {
      const raw = await doc.getOutline();
      if (!raw) return [];

      const convert = async (items: typeof raw): Promise<OutlineNode[]> => {
        const out: OutlineNode[] = [];
        for (const item of items) {
          let page = 0;
          try {
            const dest =
              typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
            if (Array.isArray(dest) && dest[0]) {
              page = await doc.getPageIndex(dest[0] as never);
            }
          } catch {
            // Destination tidak bisa diselesaikan — default ke halaman pertama.
          }
          out.push({
            title: item.title,
            page,
            children: item.items?.length ? await convert(item.items) : [],
          });
        }
        return out;
      };

      return convert(raw);
    });
  } catch (err) {
    console.warn(`  ! ekstraksi outline dilewati: ${(err as Error).message}`);
    return [];
  }
}
