/**
 * Menghasilkan PDF uji multi-halaman untuk memverifikasi pipeline konversi.
 *
 * Halaman 1 sengaja memuat blok MERAH, HIJAU, dan BIRU berlabel. PDFium
 * menghasilkan bitmap BGRA sementara sharp mengharapkan RGBA — kalau konversi
 * kanal di packages/pdf-engine hilang, blok "MERAH" akan tampil biru. Ini
 * pemeriksaan regresi warna yang paling murah dan paling cepat terlihat.
 *
 * Pemakaian:  node fixtures/make-test-pdf.mjs [jumlahHalaman]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';

/**
 * pdf-lib tidak punya API tingkat tinggi untuk anotasi link, jadi kita tulis
 * objek Annot-nya langsung. Ini penting: tanpa link asli di fixture, jalur
 * ekstraksi link di packages/pdf-engine tidak pernah benar-benar teruji.
 */
function addLink(doc, page, { x, y, width, height, url }) {
  const annot = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: doc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
  });
  const existing = page.node.get(PDFName.of('Annots'));
  if (existing) existing.push(annot);
  else page.node.set(PDFName.of('Annots'), doc.context.obj([annot]));
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_COUNT = Math.max(2, Number(process.argv[2]) || 12);

const PALETTE = [
  rgb(0.16, 0.21, 0.34),
  rgb(0.55, 0.24, 0.29),
  rgb(0.2, 0.38, 0.35),
  rgb(0.42, 0.34, 0.2),
  rgb(0.3, 0.24, 0.42),
];

const doc = await PDFDocument.create();
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const regular = await doc.embedFont(StandardFonts.Helvetica);

const W = 595; // A4 potret dalam poin
const H = 842;

for (let i = 0; i < PAGE_COUNT; i++) {
  const page = doc.addPage([W, H]);

  if (i === 0) {
    // Sampul + kartu uji warna.
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.11, 0.12, 0.15) });
    page.drawText('FLIPBOOK', {
      x: 56,
      y: H - 130,
      size: 44,
      font: bold,
      color: rgb(0.96, 0.96, 0.98),
    });
    page.drawText('Dokumen uji pipeline konversi', {
      x: 56,
      y: H - 168,
      size: 14,
      font: regular,
      color: rgb(0.62, 0.65, 0.73),
    });

    const swatches = [
      ['MERAH', rgb(0.85, 0.15, 0.15)],
      ['HIJAU', rgb(0.15, 0.7, 0.3)],
      ['BIRU', rgb(0.15, 0.35, 0.9)],
    ];
    swatches.forEach(([label, color], idx) => {
      const x = 56 + idx * 165;
      page.drawRectangle({ x, y: H - 400, width: 150, height: 150, color });
      page.drawText(String(label), {
        x: x + 12,
        y: H - 380,
        size: 16,
        font: bold,
        color: rgb(1, 1, 1),
      });
    });

    page.drawText('Jika blok MERAH tampil biru, konversi BGRA ke RGBA tidak jalan.', {
      x: 56,
      y: H - 440,
      size: 11,
      font: regular,
      color: rgb(0.55, 0.58, 0.66),
    });
    continue;
  }

  const tint = PALETTE[i % PALETTE.length];
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.98, 0.98, 0.97) });
  page.drawRectangle({ x: 0, y: H - 190, width: W, height: 190, color: tint });

  page.drawText(`Halaman ${i + 1}`, {
    x: 56,
    y: H - 110,
    size: 34,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Blok teks supaya ekstraksi teks punya sesuatu untuk diambil.
  const lines = [
    'Halaman ini dihasilkan untuk menguji pipeline konversi PDF.',
    'Setiap halaman dirender jadi tiga varian resolusi: thumb, preview, full.',
    'Teks di sini diekstrak lewat PDFium untuk pencarian dan aksesibilitas.',
    'Koordinat elemen disimpan sebagai fraksi 0-1, tidak pernah piksel.',
  ];
  lines.forEach((line, idx) => {
    page.drawText(line, {
      x: 56,
      y: H - 250 - idx * 22,
      size: 11.5,
      font: regular,
      color: rgb(0.25, 0.27, 0.32),
    });
  });

  // Penanda sudut — memudahkan melihat kalau halaman terpotong atau tertukar.
  page.drawRectangle({ x: W - 78, y: 40, width: 38, height: 38, color: tint });
  page.drawText(String(i + 1), {
    x: W - 68,
    y: 52,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Tombol ber-link asli, supaya ekstraksi anotasi punya sesuatu untuk ditemukan.
  page.drawRectangle({ x: 56, y: H - 340, width: 190, height: 40, color: tint });
  page.drawText('Kunjungi situs', {
    x: 74,
    y: H - 328,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  addLink(doc, page, {
    x: 56,
    y: H - 340,
    width: 190,
    height: 40,
    url: 'https://example.com/produk',
  });
}

/**
 * pdf-lib juga tidak punya API outline, jadi pohon /Outlines ditulis manual.
 * Tanpa ini, jalur ekstraksi outline dan panel daftar isi di player tidak
 * pernah teruji dengan data nyata.
 */
{
  const pageRefs = doc.getPages().map((p) => p.ref);
  const entries = [
    { title: 'Sampul', page: 0 },
    { title: 'Bagian Satu', page: 1 },
    { title: 'Bagian Dua', page: Math.min(4, PAGE_COUNT - 1) },
    { title: 'Penutup', page: PAGE_COUNT - 1 },
  ].filter((e) => e.page < PAGE_COUNT);

  const outlinesRef = doc.context.nextRef();
  const itemRefs = entries.map(() => doc.context.nextRef());

  entries.forEach((entry, i) => {
    const item = {
      Title: PDFString.of(entry.title),
      Parent: outlinesRef,
      Dest: [pageRefs[entry.page], PDFName.of('Fit')],
    };
    if (i > 0) item.Prev = itemRefs[i - 1];
    if (i < entries.length - 1) item.Next = itemRefs[i + 1];
    doc.context.assign(itemRefs[i], doc.context.obj(item));
  });

  doc.context.assign(
    outlinesRef,
    doc.context.obj({
      Type: 'Outlines',
      First: itemRefs[0],
      Last: itemRefs[itemRefs.length - 1],
      Count: entries.length,
    }),
  );
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
}

const outDir = join(HERE, 'pdfs');
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, 'sample-catalog.pdf');
await writeFile(outPath, await doc.save());

console.log(`PDF uji ${PAGE_COUNT} halaman ditulis ke ${outPath}`);
