/**
 * Pipeline konversi: PDF → halaman raster multi-resolusi + manifest.
 *
 * Ini versi CLI dari job worker yang dijelaskan di docs/02-ARCHITECTURE.md §3.
 * Bentuk output-nya sengaja dibuat identik dengan yang nanti diunggah ke R2,
 * supaya perpindahan dari filesystem lokal ke object storage hanya mengganti
 * lapisan penulisan — bukan pipeline-nya.
 *
 * Pemakaian:
 *   pnpm convert <file.pdf> [--title "Judul"] [--id slug] [--out dir]
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PdfiumEngine } from '@flip/pdf-engine';
import {
  MANIFEST_VERSION,
  type BookManifest,
  type PageManifest,
  type SearchIndex,
} from '@flip/manifest';

interface ProcessedPage {
  page: PageManifest;
  text: string;
}

/**
 * PDFium mengembalikan teks dengan pemenggalan baris mengikuti tata letak
 * cetak, bukan kalimat. Untuk pencarian, whitespace diratakan supaya frasa
 * yang terpotong antar-baris tetap bisa ditemukan.
 */
function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Lebar target dalam piksel per varian. Lihat docs/02-ARCHITECTURE.md §5.3. */
const VARIANTS = {
  full: 1600,
  preview: 900,
  thumb: 200,
} as const;

const QUALITY = { full: 80, preview: 75, thumb: 60 } as const;

/** Batasi konkurensi agar dokumen besar tidak menghabiskan RAM. */
const CONCURRENCY = Math.max(2, Math.min(8, (Number(process.env['CONVERT_CONCURRENCY']) || 4)));

/**
 * `pnpm --filter` menjalankan skrip dengan cwd di direktori paket, bukan di
 * tempat pengguna mengetik perintah. pnpm menyimpan direktori asli di
 * INIT_CWD — tanpa ini, path relatif seperti `fixtures/x.pdf` akan dicari
 * di dalam apps/worker/ dan gagal.
 */
const USER_CWD = process.env['INIT_CWD'] ?? process.cwd();

/** Akar repo, diturunkan dari lokasi file ini: apps/worker/src → naik tiga. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

interface Args {
  input: string;
  title?: string;
  id?: string;
  out?: string;
}

function parseArgs(argv: string[]): Args {
  const [input, ...rest] = argv;
  if (!input) {
    console.error('Pemakaian: pnpm convert <file.pdf> [--title "Judul"] [--id slug] [--out dir]');
    process.exit(1);
  }
  const args: Args = { input };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!key?.startsWith('--') || value === undefined) continue;
    const name = key.slice(2) as keyof Omit<Args, 'input'>;
    if (name === 'title' || name === 'id' || name === 'out') args[name] = value;
  }
  return args;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'flipbook'
  );
}

/** Jalankan task dengan batas konkurensi, mempertahankan urutan hasil. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Pindai direktori output dan tulis ulang index.json.
 * Player memakainya untuk menampilkan daftar flipbook saat dibuka tanpa ?book=.
 */
async function rebuildIndex(outRoot: string): Promise<void> {
  const entries = await readdir(outRoot, { withFileTypes: true });
  const books = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(join(outRoot, entry.name, 'manifest.json'), 'utf8');
      const m = JSON.parse(raw) as BookManifest;
      books.push({
        id: m.id,
        title: m.title,
        pageCount: m.pageCount,
        cover: m.pages[0]?.assets.preview ?? '',
        createdAt: m.createdAt,
      });
    } catch {
      // Direktori tanpa manifest yang valid — lewati.
    }
  }

  books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await writeFile(join(outRoot, 'index.json'), JSON.stringify(books, null, 2), 'utf8');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(USER_CWD, args.input);
  const started = performance.now();

  const source = new Uint8Array(await readFile(inputPath));
  if (source.length === 0) throw new Error('File PDF kosong.');

  const baseName = basename(inputPath, extname(inputPath));
  const title = args.title ?? baseName;
  const id =
    args.id ??
    `${slugify(baseName)}-${createHash('sha1').update(source).digest('hex').slice(0, 8)}`;

  // Default output: public/ milik player, supaya bisa langsung dilihat via `pnpm dev`.
  const outRoot = args.out
    ? resolve(USER_CWD, args.out)
    : join(REPO_ROOT, 'apps/player/public/books');
  const bookDir = join(outRoot, id);
  const pagesDir = join(bookDir, 'pages');

  await rm(bookDir, { recursive: true, force: true });
  await mkdir(pagesDir, { recursive: true });

  console.log(`\n  Konversi  ${basename(inputPath)}`);
  console.log(`  ID        ${id}`);
  console.log(`  Output    ${bookDir}\n`);

  const engine = await PdfiumEngine.create();
  const doc = await engine.open(source);

  try {
    const pageCount = doc.pageCount();
    if (pageCount === 0) throw new Error('PDF tidak punya halaman.');
    console.log(`  ${pageCount} halaman, konkurensi ${CONCURRENCY}\n`);

    const outline = await doc.outline();
    const indices = Array.from({ length: pageCount }, (_, i) => i);
    let done = 0;

    const processed = await mapLimit(indices, CONCURRENCY, async (index): Promise<ProcessedPage> => {
      const size = doc.getPageSize(index);

      // Render sekali pada resolusi tertinggi, lalu turunkan skalanya.
      // Merender ulang per varian akan membuang waktu PDFium tiga kali lipat.
      const scale = VARIANTS.full / size.width;
      const rendered = await doc.renderPage(index, scale);

      const image = sharp(Buffer.from(rendered.data), {
        raw: { width: rendered.width, height: rendered.height, channels: 4 },
      });

      const num = String(index + 1).padStart(4, '0');
      await Promise.all(
        (Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>).map(async (variant) => {
          await image
            .clone()
            .resize({ width: VARIANTS[variant], withoutEnlargement: true })
            .webp({ quality: QUALITY[variant] })
            .toFile(join(pagesDir, `${num}.${variant}.webp`));
        }),
      );

      const links = await doc.extractLinks(index);
      const text = normalizeText(await doc.extractText(index));

      done += 1;
      const pct = Math.round((done / pageCount) * 100);
      process.stdout.write(`\r  [${String(pct).padStart(3)}%] ${done}/${pageCount} halaman`);

      return {
        page: {
          index,
          width: size.width,
          height: size.height,
          assets: {
            thumb: `pages/${num}.thumb.webp`,
            preview: `pages/${num}.preview.webp`,
            full: `pages/${num}.full.webp`,
          },
          links,
        },
        text,
      };
    });

    processed.sort((a, b) => a.page.index - b.page.index);
    const pages = processed.map((p) => p.page);

    // Indeks pencarian ditulis terpisah — lihat catatan di @flip/manifest.
    const searchPages = processed
      .filter((p) => p.text.length > 0)
      .map((p) => ({ index: p.page.index, text: p.text }));
    const hasText = searchPages.length > 0;
    if (hasText) {
      const index: SearchIndex = { pages: searchPages };
      await writeFile(join(bookDir, 'search.json'), JSON.stringify(index), 'utf8');
    }

    const manifest: BookManifest = {
      manifestVersion: MANIFEST_VERSION,
      id,
      title,
      pageCount,
      assetBase: '.',
      searchIndex: hasText ? 'search.json' : null,
      pages,
      outline,
      settings: {
        effect: 'flip',
        coverAlone: true,
        backgroundColor: '#1c1e26',
      },
      createdAt: new Date().toISOString(),
    };

    await writeFile(join(bookDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    await rebuildIndex(outRoot);

    const elapsed = ((performance.now() - started) / 1000).toFixed(1);
    const linkCount = pages.reduce((sum, p) => sum + p.links.length, 0);
    const words = searchPages.reduce((sum, p) => sum + p.text.split(' ').length, 0);
    console.log(`\n\n  Selesai dalam ${elapsed}s`);
    console.log(
      `  ${pageCount} halaman × 3 varian · ${linkCount} link · ${outline.length} entri outline · ${words} kata terindeks`,
    );
    console.log(`\n  Jalankan:  pnpm dev     lalu buka  /?book=${id}\n`);
  } finally {
    doc.destroy();
    engine.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(`\n  Konversi gagal: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
