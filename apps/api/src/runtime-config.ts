const defaultApiPort = 3000;
const decimalPortPattern = /^[1-9][0-9]{0,4}$/;

export class ApiRuntimeConfigError extends Error {
  constructor() {
    super("PORT must be a base-10 integer between 1 and 65535.");
    this.name = "ApiRuntimeConfigError";
  }
}

export function parseApiPort(input: unknown): number {
  if (input === undefined) {
    return defaultApiPort;
  }

  if (typeof input !== "string" || !decimalPortPattern.test(input)) {
    throw new ApiRuntimeConfigError();
  }

  const port = Number(input);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new ApiRuntimeConfigError();
  }

  return port;
}
