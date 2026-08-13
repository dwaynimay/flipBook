import { PageFlip, type PageFlipEvent } from "page-flip";

import type { FlipbookPage, ReaderPageChange } from "./contracts.js";
import { pageChangeFromIndex } from "./page-mapping.js";

export interface EngineSessionCallbacks {
  readonly onBusyChange: (busy: boolean) => void;
  readonly onPageChange: (change: ReaderPageChange) => void;
}

export interface EngineSession {
  readonly destroy: () => void;
  readonly flipNext: () => void;
  readonly flipPrevious: () => void;
  readonly portalTargets: readonly EnginePortalTarget[];
}

export interface EnginePortalTarget {
  readonly element: HTMLElement;
  readonly pageId: string;
}

interface PageFlipLifecycle {
  readonly destroy: () => void;
  readonly flipNext: () => void;
  readonly flipPrev: () => void;
  readonly loadFromHTML: (pages: HTMLElement[]) => void;
  readonly off: (event: string) => void;
  readonly on: (event: string, handler: (event: PageFlipEvent) => void) => void;
}

export type PageFlipFactory = (
  root: HTMLElement,
  settings: ConstructorParameters<typeof PageFlip>[1],
) => PageFlipLifecycle;

const defaultPageFlipFactory: PageFlipFactory = (root, settings) => new PageFlip(root, settings);

function eventIndex(event: PageFlipEvent): number | undefined {
  return typeof event.data === "number" && Number.isSafeInteger(event.data)
    ? event.data
    : undefined;
}

export function createEngineSession(
  host: HTMLElement,
  pages: readonly FlipbookPage[],
  startPage: number,
  callbacks: EngineSessionCallbacks,
  createPageFlip: PageFlipFactory = defaultPageFlipFactory,
): EngineSession {
  const engineRoot = document.createElement("div");
  engineRoot.className = "flipbook-engine-root";
  host.append(engineRoot);

  const portalTargets: EnginePortalTarget[] = [];
  const pageElements = pages.map((page) => {
    const pageElement = document.createElement("div");
    pageElement.className = "flipbook-page";
    pageElement.dataset.density = page.isCover === true ? "hard" : "soft";
    pageElement.dataset.flipPage = "true";
    const contentMount = document.createElement("div");
    contentMount.className = "flipbook-page-content";
    pageElement.append(contentMount);
    portalTargets.push({ element: contentMount, pageId: page.pageId });
    return pageElement;
  });

  const engine = createPageFlip(engineRoot, {
    autoSize: true,
    clickEventForward: true,
    disableFlipByClick: true,
    drawShadow: true,
    flippingTime: 640,
    height: 720,
    maxHeight: 780,
    maxShadowOpacity: 0.26,
    maxWidth: 560,
    minHeight: 460,
    minWidth: 320,
    mobileScrollSupport: true,
    showCover: true,
    showPageCorners: true,
    size: "stretch",
    startPage,
    swipeDistance: 28,
    useMouseEvents: true,
    usePortrait: true,
    width: 520,
  });

  const handleFlip = (event: PageFlipEvent): void => {
    const index = eventIndex(event);
    const change = index === undefined ? undefined : pageChangeFromIndex(pages, index);
    if (change !== undefined) callbacks.onPageChange(change);
  };
  const handleState = (event: PageFlipEvent): void => {
    callbacks.onBusyChange(event.data !== "read");
  };

  try {
    engine.on("flip", handleFlip);
    engine.on("changeState", handleState);
    engine.loadFromHTML(pageElements);
  } catch (error) {
    engine.off("flip");
    engine.off("changeState");
    let cleanupError: unknown;
    try {
      engine.destroy();
    } catch (destroyError) {
      cleanupError = destroyError;
    } finally {
      engineRoot.remove();
    }
    if (cleanupError !== undefined) {
      throw new AggregateError(
        [error, cleanupError],
        "Page-flip initialization and cleanup failed.",
      );
    }
    throw error;
  }

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      engine.off("flip");
      engine.off("changeState");
      try {
        engine.destroy();
      } finally {
        engineRoot.remove();
      }
    },
    flipNext: () => {
      if (!destroyed) engine.flipNext();
    },
    flipPrevious: () => {
      if (!destroyed) engine.flipPrev();
    },
    portalTargets,
  };
}
