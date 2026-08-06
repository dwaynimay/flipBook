import { describe, expect, it } from "vitest";

import { ObservabilityConfigError, parseObservabilityConfig } from "../src/index.js";

describe("parseObservabilityConfig", () => {
  it("parses a valid runtime environment and applies the default log level", () => {
    expect(
      parseObservabilityConfig({
        NODE_ENV: "production",
        SERVICE_NAME: "booklet-api",
      }),
    ).toEqual({
      environment: "production",
      logLevel: "info",
      serviceName: "booklet-api",
    });
  });

  it("rejects invalid environment values without including raw input in the message", () => {
    const invalidValue = "invalid-environment-value";

    expect(() =>
      parseObservabilityConfig({
        LOG_LEVEL: "verbose",
        NODE_ENV: invalidValue,
        SERVICE_NAME: "A",
      }),
    ).toThrow(ObservabilityConfigError);

    try {
      parseObservabilityConfig({
        NODE_ENV: invalidValue,
        SERVICE_NAME: "booklet-api",
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ObservabilityConfigError);
      expect(String(error)).not.toContain(invalidValue);
    }
  });
});
