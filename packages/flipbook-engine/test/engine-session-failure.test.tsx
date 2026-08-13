// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { createEngineSession, type PageFlipFactory } from "../src/engine-session.js";

describe("createEngineSession transaction", () => {
  it("destroys a partially loaded engine and preserves the load error", () => {
    const loadError = new Error("forced load failure");
    const destroy = vi.fn();
    const off = vi.fn();
    const createPageFlip: PageFlipFactory = () => ({
      destroy,
      flipNext: vi.fn(),
      flipPrev: vi.fn(),
      loadFromHTML: () => {
        throw loadError;
      },
      off,
      on: vi.fn(),
    });
    const host = document.createElement("div");

    expect(() =>
      createEngineSession(
        host,
        [{ content: <article>Page</article>, pageId: "page-1" }],
        0,
        { onBusyChange: vi.fn(), onPageChange: vi.fn() },
        createPageFlip,
      ),
    ).toThrow(loadError);
    expect(off).toHaveBeenCalledWith("flip");
    expect(off).toHaveBeenCalledWith("changeState");
    expect(destroy).toHaveBeenCalledOnce();
    expect(host.childElementCount).toBe(0);
  });
});
