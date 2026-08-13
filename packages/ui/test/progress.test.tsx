import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Progress } from "../src/index.js";

describe("Progress", () => {
  it("clamps the accessible value", () => {
    const markup = renderToStaticMarkup(<Progress label="Progres baca" value={130} />);
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="100"');
    expect(markup).toContain('aria-label="Progres baca"');
  });
});
