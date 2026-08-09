import { describe, expect, it } from "vitest";

import { ApiRuntimeConfigError, parseApiPort } from "../src/runtime-config.js";

describe("API runtime config", () => {
  it.each([
    [undefined, 3000],
    ["1", 1],
    ["3000", 3000],
    ["65535", 65_535],
  ] as const)("parses %s as %i", (input, expected) => {
    expect(parseApiPort(input)).toBe(expected);
  });

  it.each([null, 3000, "", "0", "01", " 3000", "3000 ", "3000x", "3.5", "65536"])(
    "rejects non-canonical value %s",
    (input) => {
      expect(() => parseApiPort(input)).toThrow(ApiRuntimeConfigError);
    },
  );
});
