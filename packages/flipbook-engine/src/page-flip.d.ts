declare module "page-flip" {
  export type PageFlipOrientation = "landscape" | "portrait";

  export interface PageFlipSettings {
    readonly autoSize?: boolean;
    readonly clickEventForward?: boolean;
    readonly disableFlipByClick?: boolean;
    readonly drawShadow?: boolean;
    readonly flippingTime?: number;
    readonly height: number;
    readonly maxHeight?: number;
    readonly maxShadowOpacity?: number;
    readonly maxWidth?: number;
    readonly minHeight?: number;
    readonly minWidth?: number;
    readonly mobileScrollSupport?: boolean;
    readonly showCover?: boolean;
    readonly showPageCorners?: boolean;
    readonly size?: "fixed" | "stretch";
    readonly startPage?: number;
    readonly startZIndex?: number;
    readonly swipeDistance?: number;
    readonly useMouseEvents?: boolean;
    readonly usePortrait?: boolean;
    readonly width: number;
  }

  export interface PageFlipEvent {
    readonly data: unknown;
    readonly object: PageFlip;
  }

  export class PageFlip {
    constructor(root: HTMLElement, settings: PageFlipSettings);
    destroy(): void;
    flipNext(): void;
    flipPrev(): void;
    getCurrentPageIndex(): number;
    getOrientation(): PageFlipOrientation;
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    off(eventName: string): void;
    on(eventName: string, callback: (event: PageFlipEvent) => void): PageFlip;
    turnToPage(pageIndex: number): void;
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
  }
}
