import type { ReactNode } from "react";

export interface FlipbookPage {
  readonly content: ReactNode;
  readonly isCover?: boolean;
  readonly pageId: string;
}

export type ReaderMode = "flip" | "vertical";

export interface ReaderPageChange {
  readonly index: number;
  readonly pageId: string;
}
