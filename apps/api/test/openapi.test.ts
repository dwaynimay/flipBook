import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  compareCodeUnitStrings,
  createOpenApiDocument,
  serializeOpenApiDocument,
} from "../src/openapi/document.js";

describe("OpenAPI contract", () => {
  it("is deterministic and exposes only versioned production routes", async () => {
    const first = serializeOpenApiDocument(await createOpenApiDocument());
    const second = serializeOpenApiDocument(await createOpenApiDocument());

    expect(createHash("sha256").update(first).digest("hex")).toBe(
      createHash("sha256").update(second).digest("hex"),
    );

    const document: unknown = JSON.parse(first);
    expect(document).toMatchObject({
      components: {
        headers: {
          RequestId: expect.any(Object),
        },
        parameters: {
          IdempotencyKey: {
            in: "header",
            name: "Idempotency-Key",
            required: true,
          },
        },
      },
      paths: {
        "/api/v1/health": {
          get: {
            responses: {
              "200": {
                headers: {
                  "X-Request-Id": expect.any(Object),
                },
              },
              "500": {
                headers: {
                  "X-Request-Id": expect.any(Object),
                },
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ApiErrorEnvelopeDto" },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(first).not.toContain("contract-harness");
  });

  it("orders keys by locale-independent UTF-16 code units", () => {
    expect(["ä", "a", "Z", "A"].sort(compareCodeUnitStrings)).toEqual(["A", "Z", "a", "ä"]);
  });
});
