import pino, { type Logger as PinoLogger } from "pino";

import type { ObservabilityConfig } from "./config.js";
import {
  readValidatedCorrelationId,
  type CorrelationId,
  type CorrelatedLogger,
} from "./correlation.js";
import { REDACTED_VALUE, redactSensitiveData } from "./redaction.js";

const defenseInDepthSensitiveFields = [
  "accessKey",
  "accessKeyId",
  "accessToken",
  "apiKey",
  "authorization",
  "authorizationHeader",
  "awsAccessKeyId",
  "awsSecretAccessKey",
  "clientSecret",
  "cookie",
  "credentials",
  "databaseUrl",
  "encryptionKey",
  "minioRootPassword",
  "minioRootUser",
  "passwd",
  "password",
  "passwordHash",
  "privateKey",
  "proxyAuthorization",
  "proxyAuthorizationHeader",
  "pwd",
  "refreshToken",
  "s3AccessKey",
  "s3SecretAccessKey",
  "secret",
  "secretAccessKey",
  "sessionCookie",
  "setCookie",
  "storageAccessKey",
  "storageCredentials",
  "storageSecretKey",
  "token",
  "tokens",
] as const;

const pinoRedactionPaths = ["data", "context"].flatMap((namespace) =>
  defenseInDepthSensitiveFields.flatMap((field) => [
    `${namespace}.${field}`,
    `${namespace}.*.${field}`,
    `${namespace}.*.*.${field}`,
  ]),
);
const loggerConstructionToken = Symbol("StructuredLogger construction token");

export type LogFields = Readonly<Record<string, unknown>>;

export interface LogSink {
  write(line: string): void;
}

function sanitizeFields(fields: LogFields | undefined): LogFields {
  if (fields === undefined) {
    return {};
  }

  const redacted = redactSensitiveData(fields);

  if (redacted === null || typeof redacted !== "object" || Array.isArray(redacted)) {
    return {};
  }

  return Object.fromEntries(Object.entries(redacted));
}

function mergeFields(parent: LogFields, child: LogFields): LogFields {
  return Object.fromEntries([...Object.entries(parent), ...Object.entries(child)]);
}

export class StructuredLogger {
  readonly #activeLogger: PinoLogger;
  readonly #context: LogFields;
  readonly #correlationId: string | undefined;
  readonly #rootLogger: PinoLogger;

  private constructor(
    constructionToken: symbol,
    rootLogger: PinoLogger,
    context: LogFields,
    correlationId: string | undefined,
  ) {
    if (constructionToken !== loggerConstructionToken) {
      throw new TypeError("Logger must be created by the observability boundary.");
    }

    this.#rootLogger = rootLogger;
    this.#context = context;
    this.#correlationId = correlationId;
    this.#activeLogger =
      correlationId === undefined ? rootLogger : rootLogger.child({ correlationId });
  }

  static create(config: ObservabilityConfig, sink?: LogSink): StructuredLogger {
    const options = {
      base: {
        environment: config.environment,
        service: config.serviceName,
      },
      level: config.logLevel,
      redact: {
        censor: REDACTED_VALUE,
        paths: [...pinoRedactionPaths],
      },
    } satisfies pino.LoggerOptions;

    const rootLogger = sink === undefined ? pino(options) : pino(options, sink);
    return new StructuredLogger(loggerConstructionToken, rootLogger, {}, undefined);
  }

  child(bindings: LogFields): StructuredLogger {
    const context = mergeFields(this.#context, sanitizeFields(bindings));
    return new StructuredLogger(
      loggerConstructionToken,
      this.#rootLogger,
      context,
      this.#correlationId,
    );
  }

  debug(message: string, fields?: LogFields): void {
    this.#activeLogger.debug(this.#payload(fields), message);
  }

  error(message: string, fields?: LogFields): void {
    this.#activeLogger.error(this.#payload(fields), message);
  }

  fatal(message: string, fields?: LogFields): void {
    this.#activeLogger.fatal(this.#payload(fields), message);
  }

  info(message: string, fields?: LogFields): void {
    this.#activeLogger.info(this.#payload(fields), message);
  }

  warn(message: string, fields?: LogFields): void {
    this.#activeLogger.warn(this.#payload(fields), message);
  }

  withCorrelationId(correlationId: CorrelationId): CorrelatedLogger<StructuredLogger> {
    const correlationValue = readValidatedCorrelationId(correlationId);

    return {
      correlationId,
      logger: new StructuredLogger(
        loggerConstructionToken,
        this.#rootLogger,
        this.#context,
        correlationValue,
      ),
    };
  }

  #payload(fields: LogFields | undefined): Readonly<{
    context: LogFields;
    data: LogFields;
  }> {
    return {
      context: this.#context,
      data: sanitizeFields(fields),
    };
  }
}

export function createStructuredLogger(
  config: ObservabilityConfig,
  sink?: LogSink,
): StructuredLogger {
  return StructuredLogger.create(config, sink);
}

export function withCorrelationId(
  logger: StructuredLogger,
  correlationId: CorrelationId,
): CorrelatedLogger<StructuredLogger> {
  if (!(logger instanceof StructuredLogger)) {
    throw new TypeError("Logger must be created by the observability boundary.");
  }

  return logger.withCorrelationId(correlationId);
}
