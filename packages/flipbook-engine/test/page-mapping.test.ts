import { describe, expect, it } from "vitest";

import type { FlipbookPage } from "../src/index.js";
import { findPageIndex, pageChangeFromIndex } from "../src/index.js";

const pages: readonly FlipbookPage[] = [
  { content: "Page one", pageId: "page_one" },
  { content: "Page two", pageId: "page_two" },
];

describe("logical page mapping", () => {
  it("resolves a stable page ID without exposing an engine index", () => {
    expect(findPageIndex(pages, "page_two")).toBe(1);
    expect(findPageIndex(pages, "missing")).toBe(0);
  });

  it("rejects invalid engine indexes", () => {
    expect(pageChangeFromIndex(pages, 1)).toEqual({ index: 1, pageId: "page_two" });
    expect(pageChangeFromIndex(pages, 4)).toBeUndefined();
    expect(pageChangeFromIndex(pages, 0.5)).toBeUndefined();
  });
});
