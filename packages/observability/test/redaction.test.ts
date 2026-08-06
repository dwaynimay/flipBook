import { describe, expect, it } from "vitest";

import { REDACTED_VALUE, redactSensitiveData } from "../src/index.js";

describe("redactSensitiveData", () => {
  it("redacts sensitive fields recursively without changing safe values", () => {
    const redacted = redactSensitiveData({
      authorization: "credential-alpha",
      nested: {
        cookie: "credential-beta",
        profile: {
          passwordHash: "credential-gamma",
          refresh_token: "credential-delta",
          safe: "visible",
        },
      },
      records: [{ apiKey: "credential-epsilon" }, { tokens: ["credential-zeta"] }],
    });

    expect(redacted).toEqual({
      authorization: REDACTED_VALUE,
      nested: {
        cookie: REDACTED_VALUE,
        profile: {
          passwordHash: REDACTED_VALUE,
          refresh_token: REDACTED_VALUE,
          safe: "visible",
        },
      },
      records: [{ apiKey: REDACTED_VALUE }, { tokens: REDACTED_VALUE }],
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain("credential-");
    expect(serialized).toContain("visible");
  });

  it("handles cyclic records without throwing", () => {
    const cyclic: Record<string, unknown> = { password: "credential-theta" };
    cyclic.self = cyclic;

    expect(redactSensitiveData(cyclic)).toEqual({
      password: REDACTED_VALUE,
      self: "[Circular]",
    });
  });

  it("normalizes casing and separators for storage, authorization, and key material", () => {
    const redacted = redactSensitiveData({
      AWS_SECRET_ACCESS_KEY: "credential-aws",
      authorizationHeader: "credential-authorization",
      nested: [
        {
          "encryption-key": "credential-encryption",
          private_key: "credential-private",
          "proxy-authorization": "credential-proxy",
          secretAccessKey: "credential-storage",
          SESSION_COOKIE: "credential-session",
        },
      ],
      storageAuthToken: "credential-storage-token",
    });

    expect(JSON.stringify(redacted)).not.toContain("credential-");
    expect(redacted).toEqual({
      AWS_SECRET_ACCESS_KEY: REDACTED_VALUE,
      authorizationHeader: REDACTED_VALUE,
      nested: [
        {
          "encryption-key": REDACTED_VALUE,
          private_key: REDACTED_VALUE,
          "proxy-authorization": REDACTED_VALUE,
          secretAccessKey: REDACTED_VALUE,
          SESSION_COOKIE: REDACTED_VALUE,
        },
      ],
      storageAuthToken: REDACTED_VALUE,
    });
  });

  it("projects Errors without raw message or stack content and redacts recursive metadata", () => {
    const rootCause = Object.assign(new Error("credential-cause-message"), {
      authorization: "credential-cause",
    });
    rootCause.stack = "credential-cause-stack";
    const error = Object.assign(new Error("credential-top-message", { cause: rootCause }), {
      errorCode: "credential-free-form-code",
      password: "credential-error",
      statusCode: 503,
    });
    error.stack = "credential-top-stack";

    const redacted = redactSensitiveData(error);

    expect(JSON.stringify(redacted)).not.toContain("credential-");
    expect(redacted).toMatchObject({
      cause: {
        metadata: { authorization: REDACTED_VALUE },
        type: "Error",
      },
      metadata: {
        errorCode: "[Error text omitted]",
        password: REDACTED_VALUE,
        statusCode: 503,
      },
      type: "Error",
    });
    expect(redacted).not.toHaveProperty("message");
    expect(redacted).not.toHaveProperty("stack");
  });

  it("projects AggregateError members and omits arbitrary cause text recursively", () => {
    const aggregate = new AggregateError(
      [
        new TypeError("credential-nested-message"),
        "credential-string-member",
        { detail: "credential-detail", refreshToken: "credential-token" },
      ],
      "credential-aggregate-message",
      { cause: new Error("credential-aggregate-cause") },
    );
    aggregate.stack = "credential-aggregate-stack";

    const redacted = redactSensitiveData(aggregate);

    expect(JSON.stringify(redacted)).not.toContain("credential-");
    expect(redacted).toEqual({
      cause: { type: "Error" },
      errors: [
        { type: "TypeError" },
        "[Error cause omitted]",
        {
          detail: "[Error cause omitted]",
          refreshToken: REDACTED_VALUE,
        },
      ],
      type: "AggregateError",
    });
  });

  it("serializes Date values deterministically", () => {
    expect(
      redactSensitiveData({
        invalid: new Date(Number.NaN),
        occurredAt: new Date("2026-08-06T10:15:30.000Z"),
      }),
    ).toEqual({
      invalid: "[Invalid Date]",
      occurredAt: "2026-08-06T10:15:30.000Z",
    });
  });

  it("replaces unsupported non-plain objects with an explicit safe placeholder", () => {
    class ExternalPayload {
      readonly detail = "credential-external-object";
    }

    const redacted = redactSensitiveData({
      external: new ExternalPayload(),
      map: new Map([["password", "credential-map"]]),
    });

    expect(redacted).toEqual({
      external: "[Unsupported object]",
      map: "[Unsupported object]",
    });
    expect(JSON.stringify(redacted)).not.toContain("credential-");
  });

  it("keeps __proto__ as inert data instead of mutating the output prototype", () => {
    const tainted = Object.fromEntries([
      ["__proto__", { privateKey: "credential-prototype" }],
      ["safe", "visible"],
    ]);

    const redacted = redactSensitiveData(tainted);
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(redacted, "__proto__");

    expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
    expect(prototypeDescriptor?.value).toEqual({ privateKey: REDACTED_VALUE });
    expect(JSON.stringify(redacted)).not.toContain("credential-prototype");
  });
});
