import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { ApiProblem, type ApiErrorDetail } from "../src/contracts/api-error.js";

describe("public API problem registry", () => {
  const validDetail: ApiErrorDetail = { field: "title", reason: "length_out_of_range" };

  function expectInvalidDetails(details: unknown): void {
    expect(() => ApiProblem.validationFailed(details)).toThrow(
      "Validation details must use the public error registry.",
    );
  }

  it("uses fixed public metadata for idempotency failures", () => {
    const problem = ApiProblem.invalidIdempotencyKey();

    expect(problem.code).toBe("INVALID_IDEMPOTENCY_KEY");
    expect(problem.message).toBe("Idempotency-Key wajib berisi 8-128 karakter aman.");
    expect(problem.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(problem.details).toBeUndefined();
  });

  it("copies registered validation details and rejects unsafe field paths", () => {
    const details: ApiErrorDetail[] = [{ field: "title", reason: "length_out_of_range" }];
    const problem = ApiProblem.validationFailed(details);
    details[0] = { field: "replacement", reason: "invalid_value" };

    expect(problem.details).toEqual([{ field: "title", reason: "length_out_of_range" }]);
    expect(Object.isFrozen(problem)).toBe(true);
    expect(Object.isFrozen(problem.details)).toBe(true);
    expect(Object.isFrozen(problem.details?.[0])).toBe(true);
    expect(() =>
      ApiProblem.validationFailed([{ field: "private field", reason: "unknown_field" }]),
    ).toThrow("Validation details must use the public error registry.");
  });

  it("rejects reflective construction without the module-private issuance token", () => {
    expect(() =>
      Reflect.construct(ApiProblem, [
        {
          code: "INTERNAL_ERROR",
          message: "forged public message",
          status: HttpStatus.OK,
        },
      ]),
    ).toThrow("ApiProblem instances must be created by a public factory.");
  });

  it("snapshots each validation detail property exactly once", () => {
    let fieldReads = 0;
    let reasonReads = 0;
    const changingDetail: ApiErrorDetail = {
      get field(): string {
        fieldReads += 1;
        return fieldReads === 1 ? "title" : "private field";
      },
      get reason(): "length_out_of_range" | "invalid_value" {
        reasonReads += 1;
        return reasonReads === 1 ? "length_out_of_range" : "invalid_value";
      },
    };

    const problem = ApiProblem.validationFailed([changingDetail]);

    expect(problem.details).toEqual([{ field: "title", reason: "length_out_of_range" }]);
    expect(fieldReads).toBe(1);
    expect(reasonReads).toBe(1);
  });

  it("safely rejects throwing detail getters after one read per property", () => {
    let fieldReads = 0;
    let reasonReads = 0;
    const throwingDetail: ApiErrorDetail = {
      get field(): string {
        fieldReads += 1;
        throw new Error("private getter failure");
      },
      get reason(): "invalid_value" {
        reasonReads += 1;
        return "invalid_value";
      },
    };

    expect(() => ApiProblem.validationFailed([throwingDetail])).toThrow(
      "Validation details must use the public error registry.",
    );
    expect(fieldReads).toBe(1);
    expect(reasonReads).toBe(1);
  });

  it("never uses an overridden map and snapshots container length and index once", () => {
    let indexReads = 0;
    let lengthReads = 0;
    let mapReads = 0;
    const source = [validDetail];
    Object.defineProperty(source, "0", {
      configurable: true,
      enumerable: true,
      get: (): ApiErrorDetail => {
        indexReads += 1;
        return validDetail;
      },
    });
    const hostile = new Proxy(source, {
      get: (target, property, receiver): unknown => {
        if (property === "length") {
          lengthReads += 1;
        }
        if (property === "map") {
          mapReads += 1;
          throw new Error("input-owned map must not run");
        }
        return Reflect.get(target, property, receiver);
      },
    });

    expect(ApiProblem.validationFailed(hostile).details).toEqual([validDetail]);
    expect(lengthReads).toBe(1);
    expect(indexReads).toBe(1);
    expect(mapReads).toBe(0);
  });

  it.each([
    ["sparse", new Array<unknown>(1)],
    ["undefined element", [undefined]],
  ] as const)("rejects a %s details array", (_label, details) => {
    expectInvalidDetails(details);
  });

  it("rejects a throwing length after exactly one read", () => {
    let lengthReads = 0;
    const hostile = new Proxy([validDetail], {
      get: (target, property, receiver): unknown => {
        if (property === "length") {
          lengthReads += 1;
          throw new Error("private length failure");
        }
        return Reflect.get(target, property, receiver);
      },
    });

    expectInvalidDetails(hostile);
    expect(lengthReads).toBe(1);
  });

  it("rejects a throwing index after exactly one read", () => {
    let indexReads = 0;
    const source = [validDetail];
    Object.defineProperty(source, "0", {
      configurable: true,
      enumerable: true,
      get: (): never => {
        indexReads += 1;
        throw new Error("private index failure");
      },
    });

    expectInvalidDetails(source);
    expect(indexReads).toBe(1);
  });

  it("rejects a revoked array Proxy without leaking its native error", () => {
    const revocable = Proxy.revocable([validDetail], {});
    revocable.revoke();

    expectInvalidDetails(revocable.proxy);
  });

  it("rejects more than 32 validation details", () => {
    const oversized = Array.from({ length: 33 }, () => validDetail);

    expectInvalidDetails(oversized);
  });

  it("rejects arrays augmented with non-index own properties", () => {
    const augmented = [validDetail];
    Object.defineProperty(augmented, "metadata", {
      enumerable: true,
      value: "private",
    });

    expectInvalidDetails(augmented);
  });
});
