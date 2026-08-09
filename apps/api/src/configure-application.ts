import {
  createStructuredLogger,
  parseObservabilityConfig,
  type StructuredLogger,
} from "@booklet/observability";
import { HttpAdapterHost } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { API_PREFIX } from "./api.constants.js";
import { ApiExceptionFilter } from "./http/api-exception.filter.js";
import { requestContextMiddleware } from "./http/request-context.js";
import { createApiValidationPipe } from "./http/validation.js";

function createApiLogger(): StructuredLogger {
  const environment = process.env.NODE_ENV ?? "development";
  return createStructuredLogger(
    parseObservabilityConfig({
      LOG_LEVEL: process.env.LOG_LEVEL ?? (environment === "test" ? "silent" : "info"),
      NODE_ENV: environment,
      SERVICE_NAME: "booklet-api",
    }),
  );
}

export function configureApplication(
  application: NestExpressApplication,
  logger: StructuredLogger = createApiLogger(),
): void {
  application.use(requestContextMiddleware);
  application.useBodyParser("json");
  application.useBodyParser("urlencoded", { extended: true });
  application.setGlobalPrefix(API_PREFIX);
  application.useGlobalPipes(createApiValidationPipe());
  application.useGlobalFilters(new ApiExceptionFilter(application.get(HttpAdapterHost), logger));
}
