import { z } from "zod";

const serviceNamePattern = /^[a-z][a-z0-9-]{1,62}$/;

export type RuntimeMode = "development" | "production" | "test";
export type StructuredLogLevel = "debug" | "error" | "fatal" | "info" | "silent" | "warn";

const runtimeEnvironmentSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]),
  SERVICE_NAME: z.string().regex(serviceNamePattern),
});

export interface ObservabilityConfig {
  readonly environment: RuntimeMode;
  readonly logLevel: StructuredLogLevel;
  readonly serviceName: string;
}

export class ObservabilityConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super("Observability configuration is invalid.");
    this.name = "ObservabilityConfigError";
    this.issues = issues;
  }
}

function formatIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length === 0 ? "environment" : issue.path.join(".");
  return `${path}: ${issue.message}`;
}

export function parseObservabilityConfig(input: unknown): ObservabilityConfig {
  const parsed = runtimeEnvironmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ObservabilityConfigError(parsed.error.issues.map(formatIssue));
  }

  return {
    environment: parsed.data.NODE_ENV,
    logLevel: parsed.data.LOG_LEVEL,
    serviceName: parsed.data.SERVICE_NAME,
  };
}
