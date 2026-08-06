import { describe, expect, it } from "vitest";

import {
  CorrelationId,
  createStructuredLogger,
  parseCorrelationId,
  resolveCorrelationId,
  withCorrelationId,
  type LogSink,
} from "../src/index.js";
import { readValidatedCorrelationId } from "../src/correlation.js";

type StructuralForgeryIsAssignable = { readonly value: string } extends CorrelationId
  ? true
  : false;

const structuralForgeryIsAssignable: StructuralForgeryIsAssignable = false;

const discardSink: LogSink = {
  write(): void {},
};

describe("correlation IDs", () => {
  it("accepts a bounded request ID containing safe header characters", () => {
    expect(parseCorrelationId("request_01:reader.test")?.toString()).toBe("request_01:reader.test");
  });

  it("remains nominal rather than accepting a structural value", () => {
    expect(structuralForgeryIsAssignable).toBe(false);
  });

  it.each([undefined, 42, "", "contains spaces", "line\nbreak", "x".repeat(129)])(
    "rejects invalid input %j",
    (input: unknown) => {
      expect(parseCorrelationId(input)).toBeUndefined();
    },
  );

  it("generates an ID when the incoming value is invalid", () => {
    expect(resolveCorrelationId("invalid value", () => "generated-request-id").toString()).toBe(
      "generated-request-id",
    );
  });

  it("rejects an invalid generator result", () => {
    expect(() => resolveCorrelationId(undefined, () => "invalid value")).toThrow(
      "Correlation ID generator returned an invalid value.",
    );
  });

  it.each([
    { toString: () => "forged-request-id" },
    { toString: () => "forged\nrequest-id" },
    Object.create(Object.prototype),
  ])("rejects a forged runtime value at the logger boundary", (forged: unknown) => {
    const logger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "silent",
        serviceName: "booklet-api",
      },
      discardSink,
    );

    expect(() => Reflect.apply(withCorrelationId, undefined, [logger, forged])).toThrow(
      "Correlation ID must be created by the observability boundary.",
    );
  });

  it("rejects an object with a forged CorrelationId prototype but no private state", () => {
    const logger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "silent",
        serviceName: "booklet-api",
      },
      discardSink,
    );
    const forged: unknown = Object.create(CorrelationId.prototype);

    expect(() => Reflect.apply(withCorrelationId, undefined, [logger, forged])).toThrow(TypeError);
  });

  it("rejects reflected construction and reads the exact canonical issued value", () => {
    const issued = resolveCorrelationId(" canonical-issued-id ");
    Object.defineProperty(issued, "toString", {
      value: () => "forged\nvalue",
    });

    expect(readValidatedCorrelationId(issued)).toBe("canonical-issued-id");

    for (const candidate of ["bad\nrequest-id", " padded-request-id ", "canonical-looking-id"]) {
      expect(() => Reflect.construct(CorrelationId, [candidate])).toThrow(
        "Correlation ID must be created by the observability boundary.",
      );
      expect(() => Reflect.construct(issued.constructor, [candidate])).toThrow(
        "Correlation ID must be created by the observability boundary.",
      );
    }
  });
});
