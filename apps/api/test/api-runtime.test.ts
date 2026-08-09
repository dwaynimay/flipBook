import "reflect-metadata";

import { createStructuredLogger } from "@booklet/observability";
import { Body, Controller, Get, Module, Post } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { IsString, Length } from "class-validator";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from "../src/api.constants.js";
import { configureApplication } from "../src/configure-application.js";
import { createApiApplication } from "../src/create-application.js";
import { ApiProblem, MAX_PUBLIC_ERROR_DETAILS } from "../src/contracts/api-error.js";
import {
  ApiIdempotencyKey,
  IdempotencyKeyHeader,
  type IdempotencyKey,
} from "../src/http/idempotency.js";

class ContractInputDto {
  @IsString()
  @Length(3, 40)
  readonly title!: string;
}

@Controller("contract-harness")
class ContractHarnessController {
  @Post("validation")
  validate(@Body() input: ContractInputDto): ContractInputDto {
    return input;
  }

  @Post("idempotency")
  @ApiIdempotencyKey()
  idempotency(@IdempotencyKeyHeader() key: IdempotencyKey): Readonly<{ key: string }> {
    return { key: key.toString() };
  }

  @Get("failure")
  fail(): never {
    throw new Error("private-internal-marker");
  }

  @Get("forged-problem")
  forgedProblem(): never {
    const forged: object = Object.create(ApiProblem.prototype);
    Object.assign(forged, {
      code: "BAD_REQUEST",
      message: "forged public message",
      status: 200,
    });
    throw forged;
  }
}

@Module({ controllers: [ContractHarnessController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest requires a class token for module metadata.
class ContractHarnessModule {}

describe("API runtime foundation contract", () => {
  let application: NestExpressApplication | undefined;
  let logLines: string[] = [];

  function activeApplication(): NestExpressApplication {
    if (application === undefined) {
      throw new Error("Test application has not been initialized.");
    }

    return application;
  }

  afterEach(async () => {
    await application?.close();
    application = undefined;
  });

  it("serves the real readiness route and returns a stable request ID", async () => {
    application = await createApiApplication();
    await application.init();

    const response = await request(application.getHttpServer())
      .get("/api/v1/health")
      .set(REQUEST_ID_HEADER, "reader-session-123")
      .expect(200);

    expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe("reader-session-123");
    expect(response.body).toEqual({ service: "api", status: "ready" });
  });

  it("replaces an invalid caller-supplied request ID", async () => {
    application = await createApiApplication();
    await application.init();

    const response = await request(application.getHttpServer())
      .get("/api/v1/health")
      .set(REQUEST_ID_HEADER, "<invalid request id>")
      .expect(200);
    const requestId: unknown = response.headers[REQUEST_ID_HEADER.toLowerCase()];

    expect(requestId).not.toBe("<invalid request id>");
    expect(requestId).toEqual(expect.any(String));
  });

  it("retains request context when malformed JSON fails before route dispatch", async () => {
    application = await createApiApplication();
    await application.init();

    const response = await request(application.getHttpServer())
      .post("/api/v1/health")
      .set(REQUEST_ID_HEADER, "malformed-json-request")
      .set("Content-Type", "application/json")
      .send('{"broken"')
      .expect(400);

    expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe("malformed-json-request");
    expect(response.body).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Periksa kembali permintaan Anda.",
        requestId: "malformed-json-request",
      },
    });
  });

  describe("test-only contract harness", () => {
    beforeEach(async () => {
      application = await NestFactory.create<NestExpressApplication>(ContractHarnessModule, {
        bodyParser: false,
        logger: false,
      });
      logLines = [];
      const logger = createStructuredLogger(
        { environment: "test", logLevel: "error", serviceName: "booklet-api" },
        { write: (line: string): void => void logLines.push(line) },
      );
      configureApplication(application, logger);
      await application.init();
    });

    it("returns allowlisted validation details without reflecting unknown fields", async () => {
      const response = await request(activeApplication().getHttpServer())
        .post("/api/v1/contract-harness/validation")
        .set(REQUEST_ID_HEADER, "validation-request")
        .send({ privateField: "must-not-leak", title: "x" })
        .expect(400);

      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          details: expect.arrayContaining([
            { field: "privateField", reason: "unknown_field" },
            { field: "title", reason: "length_out_of_range" },
          ]),
          message: "Periksa kembali data yang dikirim.",
          requestId: "validation-request",
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("must-not-leak");
    });

    it("deterministically bounds large validation failures without leaking values", async () => {
      const payload: Record<string, string> = { title: "valid title" };
      for (let index = 0; index < 40; index += 1) {
        payload[`unknown_${String(index).padStart(2, "0")}`] = `private-value-${index}`;
      }

      const response = await request(activeApplication().getHttpServer())
        .post("/api/v1/contract-harness/validation")
        .set(REQUEST_ID_HEADER, "large-validation-request")
        .send(payload)
        .expect(400);

      const expectedDetails = Array.from({ length: MAX_PUBLIC_ERROR_DETAILS }, (_, index) => ({
        field: `unknown_${String(index).padStart(2, "0")}`,
        reason: "unknown_field",
      }));
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          details: expectedDetails,
          message: "Periksa kembali data yang dikirim.",
          requestId: "large-validation-request",
        },
      });
      expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe("large-validation-request");
      expect(response.body.error.details).toHaveLength(MAX_PUBLIC_ERROR_DETAILS);
      expect(JSON.stringify(response.body)).not.toContain("private-value");
      expect(JSON.stringify(response.body)).not.toContain("constraints");
    });

    it("validates idempotency keys at the header boundary", async () => {
      const invalid = await request(activeApplication().getHttpServer())
        .post("/api/v1/contract-harness/idempotency")
        .set(IDEMPOTENCY_KEY_HEADER, "short")
        .expect(400);

      expect(invalid.body.error.code).toBe("INVALID_IDEMPOTENCY_KEY");

      await request(activeApplication().getHttpServer())
        .post("/api/v1/contract-harness/idempotency")
        .set(IDEMPOTENCY_KEY_HEADER, "attempt-2026-0001")
        .expect(201, { key: "attempt-2026-0001" });
    });

    it("does not leak unknown errors or stacks", async () => {
      const response = await request(activeApplication().getHttpServer())
        .get("/api/v1/contract-harness/failure")
        .expect(500);

      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(response.body.error.requestId).toBe(response.headers[REQUEST_ID_HEADER.toLowerCase()]);
      expect(JSON.stringify(response.body)).not.toContain("private-internal-marker");
      expect(JSON.stringify(response.body)).not.toContain("stack");
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toContain(`"correlationId":"${String(response.body.error.requestId)}"`);
      expect(logLines[0]).toContain('"errorCode":"INTERNAL_ERROR"');
      expect(logLines[0]).not.toContain("private-internal-marker");
    });

    it("does not trust objects forged with the ApiProblem prototype", async () => {
      const response = await request(activeApplication().getHttpServer())
        .get("/api/v1/contract-harness/forged-problem")
        .expect(500);

      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(JSON.stringify(response.body)).not.toContain("forged public message");
    });
  });
});
