import type { FlipbookPage, ReaderPageChange } from "./contracts.js";

export function findPageIndex(pages: readonly FlipbookPage[], pageId: string | undefined): number {
  if (pageId === undefined) return 0;
  const index = pages.findIndex((page) => page.pageId === pageId);
  return index >= 0 ? index : 0;
}

export function pageChangeFromIndex(
  pages: readonly FlipbookPage[],
  index: number,
): ReaderPageChange | undefined {
  if (!Number.isSafeInteger(index)) return undefined;
  const page = pages[index];
  return page === undefined ? undefined : { index, pageId: page.pageId };
}
