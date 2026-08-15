import { PageFace } from '../PageFace';
import type { StageProps } from './FlipStage';

/**
 * Efek slide: spread bergeser horizontal, tanpa rotasi 3D.
 *
 * Memakai model spread yang sama persis dengan efek flip, jadi kontroler,
 * drag, dan navigasi keyboard tidak perlu tahu efek mana yang aktif.
 * Perbedaannya hanya cara `progress` diterjemahkan jadi transform.
 *
 * Ini juga jalur degradasi untuk perangkat yang kesulitan dengan transform 3D:
 * translate horizontal jauh lebih murah untuk dikomposit.
 */
export function SlideStage({
  assetBase,
  spread,
  turning,
  pageOf,
  settled,
  twoPage,
  onLinkClick,
}: StageProps): React.ReactElement {
  // Posisi pecahan di sepanjang jalur spread. Saat drag, nilainya mengikuti
  // jari — sama seperti flip, halaman tidak menunggu jari dilepas.
  const offset = turning
    ? spread + (turning.dir === 'next' ? turning.progress : -turning.progress)
    : spread;

  // Render hanya spread di sekitar posisi saat ini.
  const from = Math.max(0, Math.floor(offset) - 1);
  const to = Math.ceil(offset) + 1;
  const slots: number[] = [];
  for (let s = from; s <= to; s++) slots.push(s);

  return (
    <div
      className="slider"
      style={{ transform: `translate3d(${-offset * 100}%, 0, 0)` }}
    >
      {slots.map((s) => (
        <div key={s} className="slider__slot" style={{ left: `${s * 100}%` }}>
          {twoPage ? (
            <>
              <div className="book__static book__static--left">
                <PageFace
                  page={pageOf(s * 2 - 1)}
                  assetBase={assetBase}
                  wantFull={settled && s === spread}
                  onLinkClick={onLinkClick}
                />
                <div className="gutter gutter--left" aria-hidden="true" />
              </div>
              <div className="book__static book__static--right">
                <PageFace
                  page={pageOf(s * 2)}
                  assetBase={assetBase}
                  wantFull={settled && s === spread}
                  onLinkClick={onLinkClick}
                />
                <div className="gutter gutter--right" aria-hidden="true" />
              </div>
            </>
          ) : (
            <div className="book__static book__static--single">
              <PageFace
                page={pageOf(s)}
                assetBase={assetBase}
                wantFull={settled && s === spread}
                onLinkClick={onLinkClick}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
