import { describe, expect, it } from "vitest";

import { normalizeImageResource, normalizeMythFactResource } from "../src/index.js";

describe("renderer resource policy", () => {
  it.each([
    "javascript:alert(1)",
    "http://example.test/image.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
  ])("rejects an unsafe image URL: %s", (src) =>
    expect(normalizeImageResource({ src })).toBeUndefined(),
  );

  it("accepts HTTPS and approved raster data images", () => {
    expect(normalizeImageResource({ src: "https://cdn.example.test/image.png" })?.src).toBe(
      "https://cdn.example.test/image.png",
    );
    expect(normalizeImageResource({ src: "data:image/png;base64,AA==" })?.src).toBe(
      "data:image/png;base64,AA==",
    );
  });

  it("drops an unsafe myth source without dropping educational content", () => {
    expect(
      normalizeMythFactResource({
        explanation: "Explanation",
        fact: "Fact",
        myth: "Myth",
        sourceUrl: "javascript:alert(1)",
      }),
    ).toEqual({ explanation: "Explanation", fact: "Fact", myth: "Myth" });
  });
});
