import { describe, expect, it } from "vitest";

import {
  StructuredLogger,
  createStructuredLogger,
  resolveCorrelationId,
  withCorrelationId,
  type LogSink,
} from "../src/index.js";

type StructuralLoggerSurface = Pick<StructuredLogger, keyof StructuredLogger>;
type StructuralLoggerIsAssignable = StructuralLoggerSurface extends StructuredLogger ? true : false;

const structuralLoggerIsAssignable: StructuralLoggerIsAssignable = false;

class MemorySink implements LogSink {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}

describe("structured logger", () => {
  it("is nominal rather than accepting an external structural implementation", () => {
    expect(structuralLoggerIsAssignable).toBe(false);
  });

  it("rejects an external runtime logger object", () => {
    const externalLogger: unknown = {
      child: () => externalLogger,
      info: () => undefined,
    };

    expect(() =>
      Reflect.apply(withCorrelationId, undefined, [
        externalLogger,
        resolveCorrelationId("runtime-logger-check"),
      ]),
    ).toThrow("Logger must be created by the observability boundary.");
  });

  it("rejects direct and root-constructor reflection before fake Pino can run", () => {
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "silent",
        serviceName: "booklet-api",
      },
      new MemorySink(),
    );
    const fakePino = {
      child: () => {
        throw new Error("fake Pino was reached");
      },
    };

    for (const constructor of [StructuredLogger, rootLogger.constructor]) {
      expect(() => Reflect.construct(constructor, [fakePino, {}, undefined])).toThrow(
        "Logger must be created by the observability boundary.",
      );
    }
  });

  it("writes base fields and correlation bindings through the public adapter", () => {
    const sink = new MemorySink();
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "info",
        serviceName: "booklet-api",
      },
      sink,
    );
    const correlationId = resolveCorrelationId("request-42");
    const correlated = withCorrelationId(rootLogger, correlationId);

    correlated.logger.info("request completed", { statusCode: 204 });

    expect(sink.lines).toHaveLength(1);
    const line: unknown = JSON.parse(sink.lines[0] ?? "");
    expect(line).toMatchObject({
      correlationId: "request-42",
      data: { statusCode: 204 },
      environment: "test",
      msg: "request completed",
      service: "booklet-api",
    });
  });

  it("namespaces caller data and prevents forged system-field overrides", () => {
    const sink = new MemorySink();
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "info",
        serviceName: "booklet-api",
      },
      sink,
    );
    const child = rootLogger.child({
      correlationId: "forged-context-id",
      environment: "forged-context-environment",
      level: "forged-context-level",
      msg: "forged-context-message",
      service: "forged-context-service",
    });
    const correlated = withCorrelationId(child, resolveCorrelationId("trusted-request-id"));

    correlated.logger.info("trusted message", {
      correlationId: "forged-data-id",
      environment: "forged-data-environment",
      hostname: "forged-hostname",
      level: "forged-data-level",
      msg: "forged-data-message",
      pid: "forged-pid",
      service: "forged-data-service",
      time: "forged-time",
    });

    const line: unknown = JSON.parse(sink.lines[0] ?? "");
    expect(line).toMatchObject({
      context: {
        correlationId: "forged-context-id",
        environment: "forged-context-environment",
        level: "forged-context-level",
        msg: "forged-context-message",
        service: "forged-context-service",
      },
      correlationId: "trusted-request-id",
      data: {
        correlationId: "forged-data-id",
        environment: "forged-data-environment",
        hostname: "forged-hostname",
        level: "forged-data-level",
        msg: "forged-data-message",
        pid: "forged-pid",
        service: "forged-data-service",
        time: "forged-time",
      },
      environment: "test",
      level: 30,
      msg: "trusted message",
      service: "booklet-api",
    });
  });

  it("accumulates chained context with deterministic child overrides", () => {
    const sink = new MemorySink();
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "info",
        serviceName: "booklet-api",
      },
      sink,
    );
    const child = rootLogger
      .child({ component: "reader", collision: "parent" })
      .child({ collision: "child", operation: "publish" });

    child.info("context accumulated");

    const output = sink.lines[0] ?? "";
    const line: unknown = JSON.parse(output);
    expect(line).toMatchObject({
      context: {
        collision: "child",
        component: "reader",
        operation: "publish",
      },
      data: {},
    });
    expect(output.match(/"context":/g)).toHaveLength(1);
  });

  it("preserves context before and after applying correlation", () => {
    const sink = new MemorySink();
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "info",
        serviceName: "booklet-api",
      },
      sink,
    );
    const correlated = withCorrelationId(
      rootLogger.child({ component: "reader" }),
      resolveCorrelationId("request-context-chain"),
    );

    correlated.logger.child({ operation: "resume" }).info("context preserved");

    const line: unknown = JSON.parse(sink.lines[0] ?? "");
    expect(line).toMatchObject({
      context: {
        component: "reader",
        operation: "resume",
      },
      correlationId: "request-context-chain",
      data: {},
    });
  });

  it("does not emit raw sensitive values from nested root or child bindings", () => {
    const sink = new MemorySink();
    const rootLogger = createStructuredLogger(
      {
        environment: "test",
        logLevel: "debug",
        serviceName: "booklet-api",
      },
      sink,
    );
    const child = rootLogger.child({
      authorization: "credential-iota",
      request: { cookie: "credential-kappa" },
    });

    child.warn("request rejected", {
      account: {
        password: "credential-lambda",
        tokens: ["credential-mu"],
      },
    });

    const output = sink.lines.join("");
    expect(output).not.toContain("credential-");
    expect(output.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
