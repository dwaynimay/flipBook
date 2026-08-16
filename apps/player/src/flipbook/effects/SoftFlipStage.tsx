import React, { useRef, useImperativeHandle, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import type { PageManifest } from '@flip/manifest';
import { PageFace } from '../PageFace';

export interface SoftFlipStageRef {
  flipNext(): void;
  flipPrev(): void;
  flipToPage(pageIndex: number): void;
}

interface SoftFlipStageProps {
  pages: PageManifest[];
  assetBase: string;
  width: number;
  height: number;
  twoPage: boolean;
  settled: boolean;
  initialPage?: number;
  onPageChange?: (pageIndex: number) => void;
  onLinkClick?: (link: { url?: string; targetPage?: number }) => void;
}

export const SoftFlipStage = React.forwardRef<SoftFlipStageRef, SoftFlipStageProps>(
  (
    {
      pages,
      assetBase,
      width,
      height,
      twoPage,
      settled,
      initialPage = 0,
      onPageChange,
      onLinkClick,
    },
    ref
  ) => {
    const bookRef = useRef<any>(null);

    const forceAllPagesSoft = useCallback(() => {
      if (!bookRef.current) return;
      try {
        const flip = bookRef.current.pageFlip();
        if (flip && flip.getPages()) {
          const pageCollection = flip.getPages();
          const pageList = pageCollection.getPages();
          
          if (pageList.length > 0) {
            // --- 1. Override HTMLPage (Force Soft Density) ---
            const pageProto = Object.getPrototypeOf(pageList[0]);
            if (pageProto && typeof pageProto.getDrawingDensity === 'function') {
              pageProto.getDensity = function () { return 'soft'; };
              pageProto.getDrawingDensity = function () { return 'soft'; };
              pageProto.setDensity = function () {
                this.createdDensity = 'soft';
                this.nowDrawingDensity = 'soft';
              };
              pageProto.setDrawingDensity = function () {
                this.nowDrawingDensity = 'soft';
              };
            }

            for (const page of pageList) {
              page.createdDensity = 'soft';
              page.nowDrawingDensity = 'soft';
            }

            // --- 2. Override PageCollection (Fix Object Collision Bug) ---
            // Masalah: Saat flip backward ke cover [0] atau forward ke halaman akhir [N] di landscape,
            // getFlippingPage dan getBottomPage mengembalikan objek Page yang SAMA.
            // Hal ini menyebabkan tabrakan status (state.area) saat menghitung poligon clip-path.
            // Solusi: Jika mendeteksi kondisi ini, kita gunakan newTemporaryCopy() agar objeknya terpisah.
            const collectionProto = Object.getPrototypeOf(pageCollection);
            if (collectionProto && !collectionProto.__overriddenGetBottomPage) {
              
              const origGetBottomPage = collectionProto.getBottomPage;
              collectionProto.getBottomPage = function (direction: number) {
                const bottomPage = origGetBottomPage.call(this, direction);
                const flippingPage = this.getFlippingPage(direction);
                
                // Jika flippingPage dan bottomPage menunjuk ke objek DOM/Page yang persis sama
                // (terjadi di single-page spread landscape), pisahkan instance-nya dengan clone!
                if (bottomPage === flippingPage && bottomPage !== null) {
                   return bottomPage.newTemporaryCopy();
                }
                
                return bottomPage;
              };

              collectionProto.__overriddenGetBottomPage = true;
            }

            // --- 3. Override HTMLRender (Blank Backside & State Capture) ---
            const renderObj = flip.getRender();
            const renderProto = Object.getPrototypeOf(renderObj);
            if (renderProto && !renderProto.__overriddenDrawFrame) {
              const origSetFlippingPage = renderProto.setFlippingPage;
              renderProto.setFlippingPage = function(page: any) {
                  this.__currentFlippingPage = page;
                  origSetFlippingPage.call(this, page);
              };

              const origDrawFrame = renderProto.drawFrame;
              renderProto.drawFrame = function() {
                 if (this.flippingPage && typeof this.flippingPage.getElement === 'function') {
                    const el = this.flippingPage.getElement();
                    if (el) el.classList.add('is-flipping');
                 }
                 origDrawFrame.call(this);
              };
              
              const origClear = renderProto.clear;
              renderProto.clear = function() {
                  for (const page of this.app.getPageCollection().getPages()) {
                      if (typeof page.getElement === 'function') {
                          const el = page.getElement();
                          if (el) el.classList.remove('is-flipping');
                      }
                      
                      if (typeof page.hideTemporaryCopy === 'function') {
                          if (page.getTemporaryCopy() !== this.flippingPage && 
                              page.getTemporaryCopy() !== this.bottomPage) {
                              page.hideTemporaryCopy();
                          }
                      }
                  }
                  origClear.call(this);
              };
              
              renderProto.__overriddenDrawFrame = true;
            }

            // --- 4. Override HTMLPage (Fix Spine Clipping Bug) ---
            if (pageProto && !pageProto.__overriddenDrawSoft) {
                const origDrawSoft = pageProto.drawSoft;
                pageProto.drawSoft = function (position: any, commonStyle: string) {
                    // Biarkan library melakukan render aslinya
                    origDrawSoft.call(this, position, commonStyle);
                    
                    if (this.render && this.render.getDirection() === 1 /* BACK */) {
                        // Jika ini adalah cover yang sedang dilipat mundur
                        if (this.render.__currentFlippingPage === this && this.index === 0) {
                            const pw = this.render.getRect().pageWidth;
                            
                            // Paksa elemen untuk mekar selebar 2 halaman agar tidak terpotong di spine
                            this.element.style.width = `${pw * 2}px`;
                            this.element.style.left = `-${pw}px`;
                            this.element.style.transformOrigin = `${pw}px 0px`;
                            this.element.style.backgroundColor = '#ffffff';
                            
                            // Geser semua koordinat poligon clip-path menyesuaikan origin baru
                            const currentClip = this.element.style.clipPath || this.element.style.webkitClipPath;
                            if (currentClip && currentClip.includes('polygon')) {
                                const newClip = currentClip.replace(/([0-9.-]+)px\s+([0-9.-]+)px/g, (match: string, xStr: string, yStr: string) => {
                                    const x = parseFloat(xStr) + pw;
                                    return `${x}px ${yStr}px`;
                                });
                                this.element.style.clipPath = newClip;
                                this.element.style.webkitClipPath = newClip;
                            }
                        } else {
                            this.element.style.backgroundColor = '';
                        }
                    } else {
                        this.element.style.backgroundColor = '';
                    }
                };
                pageProto.__overriddenDrawSoft = true;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }, []);

    const handleInit = useCallback(() => {
      forceAllPagesSoft();
    }, [forceAllPagesSoft]);

    const handleStateChange = useCallback(() => {
      forceAllPagesSoft();
    }, [forceAllPagesSoft]);

    useEffect(() => {
      forceAllPagesSoft();
      const timer1 = setTimeout(forceAllPagesSoft, 10);
      const timer2 = setTimeout(forceAllPagesSoft, 100);
      const timer3 = setTimeout(forceAllPagesSoft, 500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }, [forceAllPagesSoft, pages]);

    useImperativeHandle(
      ref,
      () => ({
        flipNext() {
          forceAllPagesSoft();
          if (bookRef.current) {
            const flip = bookRef.current.pageFlip();
            if (flip) flip.flipNext();
          }
        },
        flipPrev() {
          forceAllPagesSoft();
          if (bookRef.current) {
            const flip = bookRef.current.pageFlip();
            if (flip) flip.flipPrev();
          }
        },
        flipToPage(pageIndex: number) {
          forceAllPagesSoft();
          if (bookRef.current) {
            const flip = bookRef.current.pageFlip();
            if (flip) {
              const target = Math.max(0, Math.min(pages.length - 1, pageIndex));
              flip.flip(target);
            }
          }
        },
      }),
      [pages.length, forceAllPagesSoft]
    );

    const handleFlipEvent = useCallback(
      (e: { data: number }) => {
        forceAllPagesSoft();
        if (!onPageChange) return;
        onPageChange(e.data);
      },
      [onPageChange, forceAllPagesSoft]
    );

    const handleLink = useCallback(
      (link: { url?: string; targetPage?: number }) => {
        if (onLinkClick) {
          onLinkClick(link);
        }
      },
      [onLinkClick]
    );

    const startPageIndex = Math.max(0, Math.min(pages.length - 1, initialPage));

    return (
      <div
        className="soft-flip-stage"
        style={{
          width: twoPage ? width * 2 : width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <HTMLFlipBook
          ref={bookRef}
          className="soft-flip-stage__book"
          style={{}}
          width={width}
          height={height}
          size="fixed"
          minWidth={200}
          maxWidth={2400}
          minHeight={250}
          maxHeight={3000}
          startPage={startPageIndex}
          drawShadow={true}
          flippingTime={350}
          usePortrait={!twoPage}
          startZIndex={10}
          autoSize={true}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          onInit={handleInit}
          onFlip={handleFlipEvent}
          onChangeState={handleStateChange}
        >
          {pages.map((page) => {
            const isLeftPage = page.index % 2 === 1;
            return (
              <div
                key={`page-${page.index}`}
                className={`soft-flip-stage__page ${page.index === 0 ? 'is-cover' : ''} ${page.index === pages.length - 1 ? 'is-back-cover' : ''}`}
                data-density="soft"
                style={{
                  width,
                  height,
                  backgroundColor: '#ffffff',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <PageFace
                  page={page}
                  assetBase={assetBase}
                  wantFull={settled}
                  onLinkClick={handleLink}
                />
                <div
                  className={`spine-shadow ${isLeftPage ? 'spine-shadow--left' : 'spine-shadow--right'}`}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </HTMLFlipBook>
      </div>
    );
  }
);

SoftFlipStage.displayName = 'SoftFlipStage';
