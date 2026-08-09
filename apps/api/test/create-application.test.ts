import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module.js";
import { createApiApplication } from "../src/create-application.js";

describe("API application creation lifecycle", () => {
  let application: NestExpressApplication | undefined;

  afterEach(async () => {
    await application?.close();
    application = undefined;
  });

  async function createUnconfiguredApplication(): Promise<NestExpressApplication> {
    application = await NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false,
      logger: false,
    });
    return application;
  }

  it("closes exactly once and preserves a configuration failure", async () => {
    const configurationError = new Error("configuration failed");
    const unconfigured = await createUnconfiguredApplication();
    const close = vi.spyOn(unconfigured, "close");

    await expect(
      createApiApplication({
        configure: () => {
          throw configurationError;
        },
        create: async () => unconfigured,
      }),
    ).rejects.toBe(configurationError);
    expect(close).toHaveBeenCalledOnce();
    application = undefined;
  });

  it("preserves configuration and cleanup failures in an AggregateError", async () => {
    const configurationError = new Error("configuration failed");
    const closeError = new Error("close failed");
    const unconfigured = await createUnconfiguredApplication();
    const close = vi.spyOn(unconfigured, "close").mockRejectedValueOnce(closeError);

    const result = createApiApplication({
      configure: () => {
        throw configurationError;
      },
      create: async () => unconfigured,
    });

    await expect(result).rejects.toEqual(
      expect.objectContaining({ errors: [configurationError, closeError] }),
    );
    expect(close).toHaveBeenCalledOnce();
    close.mockRestore();
  });
});
