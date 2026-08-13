// @vitest-environment jsdom

import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlipbookReader } from "../src/flipbook-reader.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("real page-flip lifecycle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 1040,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 720,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("survives StrictMode replay and cleans up without removing React-owned DOM", async () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent): void => {
      errors.push(event.error);
    };
    window.addEventListener("error", onError);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const pages = [
      { content: <article>Halaman pertama</article>, isCover: true, pageId: "page-1" },
      { content: <article>Halaman kedua</article>, pageId: "page-2" },
    ] as const;

    await act(async () => {
      root.render(
        <StrictMode>
          <FlipbookReader pages={pages} />
        </StrictMode>,
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 30));

    expect(container.querySelectorAll("[data-flip-page]")).toHaveLength(2);
    expect(container.textContent).toContain("Halaman pertama");
    expect(container.textContent).toContain("Halaman kedua");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    expect(() => act(() => root.unmount())).not.toThrow();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(container.childElementCount).toBe(0);
    expect(errors.some((error) => String(error).includes("NotFoundError"))).toBe(false);
    window.removeEventListener("error", onError);
    container.remove();
  });

  it("clamps a removed page and renders an honest empty counter", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const sixPages = Array.from({ length: 6 }, (_, index) => ({
      content: <article>Halaman {index + 1}</article>,
      pageId: `page-${index + 1}`,
    }));

    await act(async () => {
      root.render(<FlipbookReader initialPageId="page-6" pages={sixPages} />);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    expect(container.textContent).toContain("6 / 6");

    await act(async () => {
      root.render(<FlipbookReader pages={sixPages.slice(0, 2)} />);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 30));
    expect(container.querySelectorAll("[data-flip-page]")).toHaveLength(2);
    expect(container.textContent).toContain("2 / 2");

    await act(async () => {
      root.render(<FlipbookReader pages={[]} />);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 30));
    expect(container.textContent).toContain("Booklet ini belum memiliki halaman.");
    expect(container.textContent).toContain("0 / 0");

    act(() => root.unmount());
    container.remove();
  });

  it("keeps the engine session for an equivalent page set while refreshing portal content", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const firstPages = [
      { content: <article>Versi awal</article>, pageId: "page-stable-1" },
      { content: <article>Halaman dua</article>, pageId: "page-stable-2" },
    ] as const;

    await act(async () => {
      root.render(<FlipbookReader pages={firstPages} />);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    const firstEngineRoot = container.querySelector(".flipbook-engine-root");
    expect(firstEngineRoot).not.toBeNull();

    await act(async () => {
      root.render(
        <FlipbookReader
          pages={firstPages.map((page) => ({
            ...page,
            content: page.pageId === "page-stable-1" ? <article>Versi baru</article> : page.content,
          }))}
        />,
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });

    expect(container.querySelector(".flipbook-engine-root")).toBe(firstEngineRoot);
    expect(container.textContent).toContain("Versi baru");
    expect(container.textContent).not.toContain("Versi awal");

    act(() => root.unmount());
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    container.remove();
  });

  it("isolates vertical navigation targets between reader instances", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      }),
    });
    const scrolledElements: Element[] = [];
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value(this: HTMLElement): void {
        scrolledElements.push(this);
      },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const pages = [
      { content: <article>Satu</article>, pageId: "shared-page-1" },
      { content: <article>Dua</article>, pageId: "shared-page-2" },
    ] as const;

    await act(async () => {
      root.render(
        <>
          <FlipbookReader pages={pages} />
          <FlipbookReader pages={pages} />
        </>,
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    });
    const readers = container.querySelectorAll<HTMLElement>(".flipbook-reader");
    const secondReader = readers[1];
    expect(secondReader).toBeDefined();

    await act(async () => {
      secondReader?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
      );
    });

    expect(scrolledElements).toHaveLength(1);
    const scrolledElement = scrolledElements[0];
    expect(scrolledElement).toBeDefined();
    if (scrolledElement === undefined) throw new Error("Expected an isolated scroll target.");
    expect(secondReader?.contains(scrolledElement)).toBe(true);
    expect(readers[0]?.contains(scrolledElement)).toBe(false);

    act(() => root.unmount());
    container.remove();
  });
});
