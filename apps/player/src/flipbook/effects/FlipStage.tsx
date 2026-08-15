import type { PageManifest } from '@flip/manifest';
import { PageFace } from '../PageFace';
import type { Turning } from '../useFlipController';

export interface StageProps {
  assetBase: string;
  spread: number;
  sheetCount: number;
  turning: Turning | null;
  angleOf(sheet: number): number;
  pageOf(index: number): PageManifest | null;
  settled: boolean;
  twoPage: boolean;
  onLinkClick(link: { url?: string; targetPage?: number }): void;
}

/**
 * Efek flip: lembar berputar 3D di sekitar punggung buku.
 *
 * Sepenuhnya CSS transform — tidak ada canvas maupun WebGL. Lihat
 * docs/00-RESEARCH.md §2.2 untuk kenapa itu keputusan yang tepat.
 *
 * Realisme "terasa seperti buku" datang dari tiga lapisan cahaya yang
 * dihitung dari sudut putaran yang sama (`angle`), bukan dari physics
 * sungguhan:
 *   - shade  : permukaan lembar menggelap saat mendekati tegak lurus —
 *              mensimulasikan sisi yang membelakangi cahaya.
 *   - shine  : kilau tipis di tepi bebas lembar, memuncak di sekitar 90°,
 *              seperti kertas yang melengkung menangkap cahaya dari samping.
 *   - contact: bayangan yang DILEMPAR lembar ke halaman statis di bawahnya —
 *              kuat saat lembar masih hampir rata (baru terangkat / hampir
 *              mendarat), nol saat tegak lurus. Ini yang paling menjual kesan
 *              "kertas yang terangkat", karena tanpanya halaman statis selalu
 *              terlihat rata terang meski ada lembar tebal melayang di atasnya.
 */
export function FlipStage(props: StageProps): React.ReactElement {
  return props.twoPage ? <TwoPage {...props} /> : <SinglePage {...props} />;
}

/** Sudut → tiga koefisien cahaya, dipakai kedua mode. */
function lightingFor(angle: number): { shade: number; shine: number; contact: number } {
  const absAngle = Math.abs(angle);
  const rad = (absAngle * Math.PI) / 180;
  return {
    shade: Math.sin(rad) * 0.55,
    shine: Math.sin(rad) * 0.3,
    // cos: 1 saat rata (0°), 0 saat tegak lurus (90°), -1 saat rata di sisi lain (180°).
    contact: Math.cos(rad),
  };
}

function TwoPage({
  assetBase,
  spread,
  sheetCount,
  turning,
  angleOf,
  pageOf,
  settled,
  onLinkClick,
}: StageProps): React.ReactElement {
  // Sisi yang sedang tersingkap oleh lembar yang berputar harus sudah
  // menampilkan halaman TUJUAN, bukan halaman saat ini — kalau tidak, pembaca
  // melihat halaman yang sama dua kali saat kertas terangkat.
  const target = turning ? (turning.dir === 'next' ? spread + 1 : spread - 1) : spread;
  const leftIndex = (turning?.dir === 'prev' ? target : spread) * 2 - 1;
  const rightIndex = (turning?.dir === 'next' ? target : spread) * 2;

  const angle = turning ? angleOf(turning.sheet) : 0;
  const { shade, shine, contact } = lightingFor(angle);
  // Bayangan pada kanan aktif selagi lembar masih dekat posisi rata-kanan (0°..90°);
  // pada kiri selagi mendekati rata-kiri (90°..180°). Keduanya nol tepat di 90°,
  // jadi tidak pernah tumpang tindih.
  const rightContact = turning && Math.abs(angle) < 90 ? contact : 0;
  const leftContact = turning && Math.abs(angle) > 90 ? -contact : 0;

  // Tumpukan tepi halaman disembunyikan di ujung buku — tidak ada "halaman
  // yang sudah dibaca" sebelum sampul, tidak ada "sisa halaman" setelah akhir.
  const atFirstSpread = spread === 0;
  const atLastSpread = spread === sheetCount;

  return (
    <>
      <div
        className={`book__static book__static--left${atFirstSpread ? ' book__static--edge' : ''}`}
      >
        <PageFace page={pageOf(leftIndex)} assetBase={assetBase} wantFull={settled} onLinkClick={onLinkClick} />
        {leftContact > 0 && (
          <div
            className="contact-shadow contact-shadow--from-right"
            style={{ opacity: leftContact * 0.5 }}
            aria-hidden="true"
          />
        )}
        <div className="gutter gutter--left" aria-hidden="true" />
      </div>

      <div
        className={`book__static book__static--right${atLastSpread ? ' book__static--edge' : ''}`}
      >
        <PageFace page={pageOf(rightIndex)} assetBase={assetBase} wantFull={settled} onLinkClick={onLinkClick} />
        {rightContact > 0 && (
          <div
            className="contact-shadow contact-shadow--from-left"
            style={{ opacity: rightContact * 0.5 }}
            aria-hidden="true"
          />
        )}
        <div className="gutter gutter--right" aria-hidden="true" />
      </div>

      {turning && (
        <div className="leaf" style={{ transform: `rotateY(${angle}deg)` }}>
          <div className="leaf__face leaf__face--front">
            <PageFace
              page={pageOf(turning.sheet * 2)}
              assetBase={assetBase}
              wantFull={false}
              onLinkClick={onLinkClick}
            />
            <div className="leaf__shade leaf__shade--front" style={{ opacity: shade }} aria-hidden="true" />
            <div className="leaf__shine leaf__shine--front" style={{ opacity: shine }} aria-hidden="true" />
          </div>
          <div className="leaf__face leaf__face--back">
            <PageFace
              page={pageOf(turning.sheet * 2 + 1)}
              assetBase={assetBase}
              wantFull={false}
              onLinkClick={onLinkClick}
            />
            <div className="leaf__shade leaf__shade--back" style={{ opacity: shade }} aria-hidden="true" />
            <div className="leaf__shine leaf__shine--back" style={{ opacity: shine }} aria-hidden="true" />
          </div>
        </div>
      )}
    </>
  );
}

function SinglePage({
  assetBase,
  spread,
  sheetCount,
  turning,
  angleOf,
  pageOf,
  settled,
  onLinkClick,
}: StageProps): React.ReactElement {
  const staticIndex = turning?.dir === 'next' ? spread + 1 : spread;
  const angle = turning ? angleOf(turning.sheet) : 0;
  const { shade, shine } = lightingFor(angle);

  // Mode satu halaman tidak punya split kiri/kanan — lembar selalu berengsel
  // di tepi kiri (lihat useFlipController). Bayangan lemparnya karena itu
  // hanya relevan di paruh pertama putaran, saat lembar baru terangkat dari
  // permukaan; di paruh kedua tidak ada "halaman baru" yang didarati karena
  // halaman statis di bawah sudah menampilkan target sejak awal.
  const departContact = turning ? Math.max(0, 1 - Math.abs(angle) / 90) : 0;
  const atLastPage = spread >= sheetCount;

  return (
    <>
      <div className={`book__static book__static--single${atLastPage ? ' book__static--edge' : ''}`}>
        <PageFace page={pageOf(staticIndex)} assetBase={assetBase} wantFull={settled} onLinkClick={onLinkClick} />
        {departContact > 0 && (
          <div
            className="contact-shadow contact-shadow--from-left"
            style={{ opacity: departContact * 0.4 }}
            aria-hidden="true"
          />
        )}
      </div>

      {turning && (
        <div className="leaf leaf--single" style={{ transform: `rotateY(${angle}deg)` }}>
          <div className="leaf__face leaf__face--front">
            <PageFace
              page={pageOf(turning.sheet)}
              assetBase={assetBase}
              wantFull={false}
              onLinkClick={onLinkClick}
            />
            <div className="leaf__shade leaf__shade--front" style={{ opacity: shade }} aria-hidden="true" />
            <div className="leaf__shine leaf__shine--front" style={{ opacity: shine }} aria-hidden="true" />
          </div>
          {/* Sisi belakang kertas — kosong, seperti lembar cetak satu sisi. */}
          <div className="leaf__face leaf__face--back leaf__face--paper">
            <div className="leaf__shade leaf__shade--back" style={{ opacity: shade }} aria-hidden="true" />
            <div className="leaf__shine leaf__shine--back" style={{ opacity: shine }} aria-hidden="true" />
          </div>
        </div>
      )}
    </>
  );
}
