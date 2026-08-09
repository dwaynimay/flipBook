import { readFile } from "node:fs/promises";

import { describe, expect, expectTypeOf, it } from "vitest";

import type { components, paths } from "../src/index.js";

describe("generated API contract", () => {
  it("is consumable as framework-free TypeScript 6 declarations", () => {
    type ErrorEnvelope = components["schemas"]["ApiErrorEnvelopeDto"];
    type ErrorReason = components["schemas"]["ApiErrorDetailDto"]["reason"];
    type HealthResponse =
      paths["/api/v1/health"]["get"]["responses"][200]["content"]["application/json"];

    expectTypeOf<ErrorEnvelope["error"]["code"]>().toMatchTypeOf<string>();
    expectTypeOf<ErrorReason>().toEqualTypeOf<
      "invalid_value" | "length_out_of_range" | "must_be_string" | "unknown_field"
    >();
    expectTypeOf<HealthResponse["status"]>().toEqualTypeOf<"ready">();
  });

  it("contains no handwritten framework or ORM dependency", async () => {
    const generated = await readFile(new URL("../src/generated.ts", import.meta.url), "utf8");
    expect(generated).not.toMatch(/@nestjs|@prisma|class-validator/);
    expect(generated).not.toMatch(/\bany\b/);
  });
});
